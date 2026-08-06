import { streamText } from "ai";

import { createLovableResponsesProvider } from "./ai-gateway.server";
import type { CodeIssue, Difficulty, ValidationInput, ValidationReport } from "./validation-types";

const MODEL_ID = "openai/gpt-5.6-sol";

const SYSTEM_PROMPT = `You are the validation engine of "Smart Code Validator", an enterprise code-assessment platform used by senior engineers.

You receive a programming question and an employee's Python or SQL submission. You must behave like a rigorous senior code reviewer plus an interviewer plus a static-analysis suite.

Do all of the following:
1. Understand the question and classify the problem (loops, arrays, strings, hashing, searching, sorting, recursion, dynamic programming, functions, OOP, SQL join, aggregation, window function, subquery, grouping, database query, etc.).
2. Statically analyse the code: syntax validity, indentation, naming conventions, unused variables, missing conditions, off-by-one errors, missing edge-case handling, bad practices, security issues (eval/exec/os.system/injection/SELECT *), formatting (PEP8 for Python).
3. Trace the code execution precisely, as an interpreter would (Python) or as SQLite would (SQL). Report the exact stdout the code would produce, or the exact traceback/error message if it fails. If the code needs sample input or a table that is not provided, invent a small reasonable sample and state it in execution.note. Estimate runtime in milliseconds and memory in KB for that sample. This is deterministic reasoning, not real execution.
4. Compare the produced output with the expected output when provided; otherwise judge correctness against the question requirements.
5. Score every dimension 0-100 honestly. A submission that does not solve the asked question must score low on logic and be rejected. Set verdict "accepted" only when the code is correct, runs without errors and satisfies the question.
6. Derive time and space complexity with a short justification.
7. Estimate difficulty (Easy | Medium | Hard | Expert) with a 0-100 difficulty score and concrete reasons.
8. Produce six full rewritten solutions (cleaner, optimized, beginner, intermediate, advanced, production) in the SAME language as the submission. Each must be complete, runnable code with no placeholder comments.
9. Produce learning feedback: concepts used, interview tips, likely interview follow-up questions, common mistakes, best practices.

Return ONLY a single JSON object (no markdown fences, no prose) with exactly this shape:
{
  "verdict": "accepted" | "rejected",
  "summary": string,
  "problemType": string[],
  "questionUnderstanding": string,
  "approachUsed": string,
  "edgeCases": string[],
  "scores": { "overall": number, "logic": number, "syntax": number, "quality": number, "efficiency": number, "bestPractices": number, "outputMatch": number, "readability": number },
  "execution": { "output": string, "error": string | null, "estimatedTimeMs": number, "estimatedMemoryKb": number, "note": string },
  "complexity": { "time": string, "space": string, "timeExplanation": string, "spaceExplanation": string },
  "difficulty": { "level": "Easy" | "Medium" | "Hard" | "Expert", "score": number, "reasons": string[] },
  "issues": [{ "severity": "critical" | "warning" | "info", "category": string, "line": number | null, "title": string, "detail": string, "fix": string }],
  "whatIsWrong": string[],
  "howToFix": string[],
  "betterApproach": string,
  "alternativeSolution": string,
  "industryStandardSolution": string,
  "suggestions": { "cleaner": string, "optimized": string, "beginner": string, "intermediate": string, "advanced": string, "production": string },
  "learning": { "concepts": string[], "interviewTips": string[], "interviewQuestions": string[], "commonMistakes": string[], "bestPractices": string[] }
}
Code strings must be plain source code (real newlines, no markdown fences). Keep every list to at most 6 items. When the submission is correct, whatIsWrong and howToFix may be empty arrays.`;

function buildUserPrompt(input: ValidationInput) {
  const expected = input.expectedOutput?.trim();
  return [
    `LANGUAGE: ${input.language.toUpperCase()}`,
    `QUESTION:\n${input.question.trim()}`,
    expected ? `EXPECTED OUTPUT (authoritative):\n${expected}` : `EXPECTED OUTPUT: not provided — infer from the question.`,
    `SUBMITTED CODE:\n${input.code}`,
    `Reviewer context: submission by ${input.employeeName} (${input.employeeCode}), ${input.department}.`,
    `Respond with the JSON object only.`,
  ].join("\n\n");
}

function extractJson(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start === -1 || end <= start) throw new Error("Model did not return JSON");
    return JSON.parse(trimmed.slice(start, end + 1));
  }
}

const clamp = (value: unknown, fallback = 0) => {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(100, Math.round(n)));
};

const str = (value: unknown, fallback = "") =>
  typeof value === "string" && value.trim().length > 0 ? value : fallback;

const list = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === "string" && v.trim() !== "") : [];

function normalizeIssues(value: unknown): CodeIssue[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 12).map((raw) => {
    const item = (raw ?? {}) as Record<string, unknown>;
    const severity = item['severity'];
    return {
      severity:
        severity === "critical" || severity === "warning" || severity === "info" ? severity : "info",
      category: str(item['category'], "General"),
      line: typeof item['line'] === "number" ? item['line'] : null,
      title: str(item['title'], "Observation"),
      detail: str(item['detail']),
      fix: str(item['fix']),
    };
  });
}

function normalize(raw: unknown): ValidationReport {
  const root = (raw ?? {}) as Record<string, unknown>;
  const scores = (root['scores'] ?? {}) as Record<string, unknown>;
  const execution = (root['execution'] ?? {}) as Record<string, unknown>;
  const complexity = (root['complexity'] ?? {}) as Record<string, unknown>;
  const difficulty = (root['difficulty'] ?? {}) as Record<string, unknown>;
  const suggestions = (root['suggestions'] ?? {}) as Record<string, unknown>;
  const learning = (root['learning'] ?? {}) as Record<string, unknown>;

  const level = difficulty['level'];
  const difficultyLevel: Difficulty =
    level === "Easy" || level === "Medium" || level === "Hard" || level === "Expert" ? level : "Medium";

  const overall = clamp(scores['overall']);
  const numeric = (value: unknown, fallback: number) => {
    const n = typeof value === "number" ? value : Number(value);
    return Number.isFinite(n) && n >= 0 ? Math.round(n) : fallback;
  };

  return {
    verdict: root['verdict'] === "accepted" ? "accepted" : "rejected",
    summary: str(root['summary'], "No summary returned."),
    problemType: list(root['problemType']).slice(0, 8),
    questionUnderstanding: str(root['questionUnderstanding']),
    approachUsed: str(root['approachUsed']),
    edgeCases: list(root['edgeCases']),
    scores: {
      overall,
      logic: clamp(scores['logic'], overall),
      syntax: clamp(scores['syntax'], overall),
      quality: clamp(scores['quality'], overall),
      efficiency: clamp(scores['efficiency'], overall),
      bestPractices: clamp(scores['bestPractices'], overall),
      outputMatch: clamp(scores['outputMatch'], overall),
      readability: clamp(scores['readability'], overall),
    },
    execution: {
      output: str(execution['output'], "(no output)"),
      error: typeof execution['error'] === "string" && execution['error'].trim() !== "" ? execution['error'] : null,
      estimatedTimeMs: numeric(execution['estimatedTimeMs'], 0),
      estimatedMemoryKb: numeric(execution['estimatedMemoryKb'], 0),
      note: str(execution['note']),
    },
    complexity: {
      time: str(complexity['time'], "Unknown"),
      space: str(complexity['space'], "Unknown"),
      timeExplanation: str(complexity['timeExplanation']),
      spaceExplanation: str(complexity['spaceExplanation']),
    },
    difficulty: {
      level: difficultyLevel,
      score: clamp(difficulty['score'], 50),
      reasons: list(difficulty['reasons']),
    },
    issues: normalizeIssues(root['issues']),
    whatIsWrong: list(root['whatIsWrong']),
    howToFix: list(root['howToFix']),
    betterApproach: str(root['betterApproach']),
    alternativeSolution: str(root['alternativeSolution']),
    industryStandardSolution: str(root['industryStandardSolution']),
    suggestions: {
      cleaner: str(suggestions['cleaner']),
      optimized: str(suggestions['optimized']),
      beginner: str(suggestions['beginner']),
      intermediate: str(suggestions['intermediate']),
      advanced: str(suggestions['advanced']),
      production: str(suggestions['production']),
    },
    learning: {
      concepts: list(learning['concepts']),
      interviewTips: list(learning['interviewTips']),
      interviewQuestions: list(learning['interviewQuestions']),
      commonMistakes: list(learning['commonMistakes']),
      bestPractices: list(learning['bestPractices']),
    },
  };
}

export async function runValidationEngine(input: ValidationInput): Promise<ValidationReport> {
  const apiKey = process.env['LOVABLE_API_KEY'];
  if (!apiKey) throw new Error("AI is not configured for this project.");

  const provider = createLovableResponsesProvider(apiKey);

  const result = streamText({
    model: provider.responses(MODEL_ID),
    system: SYSTEM_PROMPT,
    prompt: buildUserPrompt(input),
    providerOptions: {
      openai: {
        forceReasoning: true,
        reasoningEffort: "medium",
        reasoningSummary: "auto",
        store: false,
        include: ["reasoning.encrypted_content"],
      },
    },
  });

  const text = await result.text;
  if (!text.trim()) throw new Error("The AI reviewer returned an empty response. Please retry.");

  return normalize(extractJson(text));
}

import { streamText } from "ai";

import { createLovableResponsesProvider } from "./ai-gateway.server";
import { computeDecision } from "./decision-engine.server";
import { runExecutionSimulation } from "./execution.server";
import { runStaticAnalysis } from "./static-analysis.server";
import type {
  CodeIssue,
  Difficulty,
  ValidationInput,
  ValidationReport,
  Verdict,
} from "./validation-types";

const MODEL_ID = "openai/gpt-5.6-sol";

const SYSTEM_PROMPT = `You are the AI validation engine of "Smart Code Validator", an enterprise code-assessment platform used by senior engineers.

You receive a programming question, an optional expected output, and an employee's Python or SQL submission. You must behave like a rigorous senior code reviewer plus an interviewer.

Do all of the following:
1. Understand the question and classify the problem type (loops, arrays, strings, hashing, searching, sorting, recursion, dynamic programming, functions, OOP, SQL join, aggregation, window function, subquery, grouping, database query, etc.).
2. Analyse the submitted code for logic, approach, edge-case handling, and code quality.
3. Compare the code against the expected output if provided. If no expected output is provided, judge correctness against the question requirements.
4. Derive time and space complexity with a short justification.
5. Estimate difficulty (Easy | Medium | Hard | Expert) with a 0-100 difficulty score and concrete reasons.
6. Produce six full rewritten solutions (cleaner, optimized, beginner, intermediate, advanced, production) in the SAME language as the submission. Each must be complete, runnable code with no placeholder comments.
7. Produce learning feedback: concepts used, interview tips, likely interview follow-up questions, common mistakes, best practices.

IMPORTANT:
- Be lenient with equivalent correct solutions. If the code solves the problem correctly using a different valid approach, accept it and score logic highly.
- Report precise issue locations with line numbers when possible.
- Provide concrete, actionable fixes. Avoid vague advice.
- If the code is correct, whatIsWrong and howToFix must be empty arrays.

Return ONLY a single JSON object (no markdown fences, no prose) with exactly this shape:
{
  "verdict": "accepted" | "rejected",
  "summary": string,
  "problemType": string[],
  "questionUnderstanding": string,
  "approachUsed": string,
  "edgeCases": string[],
  "scores": { "logic": number, "syntax": number, "quality": number, "efficiency": number, "bestPractices": number, "outputMatch": number, "readability": number },
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
Code strings must be plain source code (real newlines, no markdown fences). Keep every list to at most 6 items.`;

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

function normalizeIssues(value: unknown, code: string): CodeIssue[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 12).map((raw) => {
    const item = (raw ?? {}) as Record<string, unknown>;
    const severity = item["severity"];
    let line = typeof item["line"] === "number" ? item["line"] : null;
    // If line is missing but detail contains a line reference, try to extract it
    if (line == null) {
      const detail = String(item["detail"] ?? "");
      const match = detail.match(/line\s+(\d+)/i);
      if (match?.[1]) line = parseInt(match[1], 10);
    }
    // Clamp line to code bounds
    const maxLine = code.split("\n").length;
    if (line != null && (line < 1 || line > maxLine)) line = null;

    return {
      severity:
        severity === "critical" || severity === "warning" || severity === "info" ? severity : "info",
      category: str(item["category"], "General"),
      line,
      title: str(item["title"], "Observation"),
      detail: str(item["detail"]),
      fix: str(item["fix"]),
    };
  });
}

function normalizeAiReport(raw: unknown, code: string) {
  const root = (raw ?? {}) as Record<string, unknown>;
  const scores = (root["scores"] ?? {}) as Record<string, unknown>;
  const complexity = (root["complexity"] ?? {}) as Record<string, unknown>;
  const difficulty = (root["difficulty"] ?? {}) as Record<string, unknown>;
  const suggestions = (root["suggestions"] ?? {}) as Record<string, unknown>;
  const learning = (root["learning"] ?? {}) as Record<string, unknown>;

  const level = difficulty["level"];
  const difficultyLevel: Difficulty =
    level === "Easy" || level === "Medium" || level === "Hard" || level === "Expert" ? level : "Medium";

  return {
    verdict: root["verdict"] === "accepted" ? "accepted" : "rejected",
    summary: str(root["summary"], "No summary returned."),
    problemType: list(root["problemType"]).slice(0, 8),
    questionUnderstanding: str(root["questionUnderstanding"]),
    approachUsed: str(root["approachUsed"]),
    edgeCases: list(root["edgeCases"]),
    scores: {
      logic: clamp(scores["logic"]),
      syntax: clamp(scores["syntax"]),
      quality: clamp(scores["quality"]),
      efficiency: clamp(scores["efficiency"]),
      bestPractices: clamp(scores["bestPractices"]),
      outputMatch: clamp(scores["outputMatch"]),
      readability: clamp(scores["readability"]),
    },
    complexity: {
      time: str(complexity["time"], "Unknown"),
      space: str(complexity["space"], "Unknown"),
      timeExplanation: str(complexity["timeExplanation"]),
      spaceExplanation: str(complexity["spaceExplanation"]),
    },
    difficulty: {
      level: difficultyLevel,
      score: clamp(difficulty["score"], 50),
      reasons: list(difficulty["reasons"]),
    },
    issues: normalizeIssues(root["issues"], code),
    whatIsWrong: list(root["whatIsWrong"]),
    howToFix: list(root["howToFix"]),
    betterApproach: str(root["betterApproach"]),
    alternativeSolution: str(root["alternativeSolution"]),
    industryStandardSolution: str(root["industryStandardSolution"]),
    suggestions: {
      cleaner: str(suggestions["cleaner"]),
      optimized: str(suggestions["optimized"]),
      beginner: str(suggestions["beginner"]),
      intermediate: str(suggestions["intermediate"]),
      advanced: str(suggestions["advanced"]),
      production: str(suggestions["production"]),
    },
    learning: {
      concepts: list(learning["concepts"]),
      interviewTips: list(learning["interviewTips"]),
      interviewQuestions: list(learning["interviewQuestions"]),
      commonMistakes: list(learning["commonMistakes"]),
      bestPractices: list(learning["bestPractices"]),
    },
  };
}

export async function runValidationEngine(input: ValidationInput): Promise<ValidationReport> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("AI is not configured for this project.");

  // Multi-signal analysis
  const staticAnalysis = runStaticAnalysis(input.code, input.language);
  const execution = await runExecutionSimulation(input.language, input.question, input.code, input.expectedOutput);

  const provider = createLovableResponsesProvider(apiKey);

  const aiResult = streamText({
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

  const text = await aiResult.text;
  if (!text.trim()) throw new Error("The AI reviewer returned an empty response. Please retry.");

  const aiReport = normalizeAiReport(extractJson(text), input.code);

  // Merge static-analysis issues with AI issues, preferring static issues when line numbers are concrete
  const staticTitles = new Set(staticAnalysis.issues.map((i) => i.title));
  const mergedIssues = [
    ...staticAnalysis.issues,
    ...aiReport.issues.filter((issue) => !staticTitles.has(issue.title)),
  ].slice(0, 12);

  // Decision engine combines all signals
  const decision = computeDecision({
    language: input.language,
    staticIssues: staticAnalysis.issues,
    hasSyntaxError: staticAnalysis.hasSyntaxError,
    hasSecurityIssue: staticAnalysis.hasSecurityIssue,
    executionOutput: execution.output,
    executionError: execution.error,
    expectedOutput: input.expectedOutput,
    aiScores: aiReport.scores,
    aiVerdict: aiReport.verdict,
    aiComplexity: aiReport.complexity,
    aiDifficulty: aiReport.difficulty,
  });

  const finalVerdict: Verdict = decision.verdict;

  // Build a professional summary if the AI summary is generic
  let summary = aiReport.summary;
  if (summary === "No summary returned." || summary.length < 20) {
    summary =
      finalVerdict === "accepted"
        ? `The ${input.language.toUpperCase()} submission correctly addresses the question and passes quality checks.`
        : `The ${input.language.toUpperCase()} submission has issues that prevent acceptance. ${decision.decisionReason}`;
  }

  return {
    verdict: finalVerdict,
    summary,
    problemType: aiReport.problemType,
    questionUnderstanding: aiReport.questionUnderstanding,
    approachUsed: aiReport.approachUsed,
    edgeCases: aiReport.edgeCases,
    scores: decision.scores,
    execution,
    complexity: aiReport.complexity,
    difficulty: aiReport.difficulty,
    issues: mergedIssues,
    whatIsWrong: finalVerdict === "accepted" ? [] : aiReport.whatIsWrong,
    howToFix: finalVerdict === "accepted" ? [] : aiReport.howToFix,
    betterApproach: aiReport.betterApproach,
    alternativeSolution: aiReport.alternativeSolution,
    industryStandardSolution: aiReport.industryStandardSolution,
    suggestions: aiReport.suggestions,
    learning: aiReport.learning,
  };
}

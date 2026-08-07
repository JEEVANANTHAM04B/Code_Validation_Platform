import { streamText } from "ai";

import { createLovableResponsesProvider } from "./ai-gateway.server";
import type { Language } from "./validation-types";

const MODEL_ID = "openai/gpt-5.6-sol";

const EXECUTION_SYSTEM_PROMPT = `You are a precise code execution engine. Your job is to simulate running the given code as faithfully as possible and report the exact output or error.

Rules:
1. For Python: trace execution line-by-line. Use the sample input or data invented from the question. Report the exact stdout. If the code errors, report the full traceback-style error with the line number where it fails.
2. For SQL: assume a reasonable SQLite schema that matches the question. Execute the query mentally. Report the exact result set as formatted text (markdown table is allowed). If the query is invalid, report the SQL error.
3. If the question provides expected output, prefer producing output that matches it when the code is logically correct.
4. Do not explain your reasoning. Return ONLY a JSON object with this exact shape:
{
  "output": string,
  "error": string | null,
  "estimatedTimeMs": number,
  "estimatedMemoryKb": number,
  "note": string
}
If output is empty, set output to "". If there is no error, set error to null. Keep note short (sample data used, assumptions, etc.).`;

function buildExecutionPrompt(language: Language, question: string, code: string, expectedOutput?: string) {
  return [
    `LANGUAGE: ${language.toUpperCase()}`,
    `QUESTION:\n${question.trim()}`,
    expectedOutput ? `EXPECTED OUTPUT:\n${expectedOutput.trim()}` : "EXPECTED OUTPUT: not provided",
    `CODE TO EXECUTE:\n${code}`,
    "Return only the JSON object.",
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

export interface ExecutionResult {
  output: string;
  error: string | null;
  estimatedTimeMs: number;
  estimatedMemoryKb: number;
  note: string;
}

export async function runExecutionSimulation(
  language: Language,
  question: string,
  code: string,
  expectedOutput?: string,
): Promise<ExecutionResult> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) {
    return {
      output: "",
      error: "AI execution engine is not configured (LOVABLE_API_KEY missing).",
      estimatedTimeMs: 0,
      estimatedMemoryKb: 0,
      note: "",
    };
  }

  const provider = createLovableResponsesProvider(apiKey);

  const result = streamText({
    model: provider.responses(MODEL_ID),
    system: EXECUTION_SYSTEM_PROMPT,
    prompt: buildExecutionPrompt(language, question, code, expectedOutput),
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

  try {
    const text = await result.text;
    if (!text.trim()) {
      return {
        output: "",
        error: null,
        estimatedTimeMs: 0,
        estimatedMemoryKb: 0,
        note: "Execution engine returned an empty response.",
      };
    }

    const raw = extractJson(text) as Record<string, unknown>;
    return {
      output: typeof raw["output"] === "string" ? raw["output"] : "",
      error:
        typeof raw["error"] === "string" && raw["error"].trim() !== "" ? raw["error"] : null,
      estimatedTimeMs:
        typeof raw["estimatedTimeMs"] === "number" ? Math.max(0, Math.round(raw["estimatedTimeMs"])) : 0,
      estimatedMemoryKb:
        typeof raw["estimatedMemoryKb"] === "number" ? Math.max(0, Math.round(raw["estimatedMemoryKb"])) : 0,
      note: typeof raw["note"] === "string" ? raw["note"] : "",
    };
  } catch (err) {
    return {
      output: "",
      error: err instanceof Error ? err.message : "Execution simulation failed.",
      estimatedTimeMs: 0,
      estimatedMemoryKb: 0,
      note: "",
    };
  }
}

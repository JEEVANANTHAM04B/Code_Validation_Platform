import type { CodeIssue, Difficulty, Language, ValidationReport, Verdict } from "./validation-types";

export interface SignalScores {
  overall: number;
  logic: number;
  syntax: number;
  quality: number;
  efficiency: number;
  bestPractices: number;
  outputMatch: number;
  readability: number;
}

export interface DecisionInput {
  language: Language;
  staticIssues: CodeIssue[];
  hasSyntaxError: boolean;
  hasSecurityIssue: boolean;
  executionOutput: string;
  executionError: string | null;
  expectedOutput?: string;
  aiScores: Partial<SignalScores>;
  aiVerdict: Verdict;
  aiComplexity: { time: string; space: string };
  aiDifficulty: { level: Difficulty; score: number; reasons: string[] };
}

function normalizeScore(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function compareOutputs(actual: string, expected: string): number {
  const a = actual.trim().replace(/\r\n/g, "\n").replace(/\s+/g, " ").toLowerCase();
  const b = expected.trim().replace(/\r\n/g, "\n").replace(/\s+/g, " ").toLowerCase();
  if (a === b) return 100;
  if (a.includes(b) || b.includes(a)) return 75;
  // Token-level similarity
  const aTokens = new Set(a.split(/\s+/));
  const bTokens = new Set(b.split(/\s+/));
  const intersection = new Set([...aTokens].filter((x) => bTokens.has(x)));
  const union = new Set([...aTokens, ...bTokens]);
  if (union.size === 0) return 0;
  return Math.round((intersection.size / union.size) * 100);
}

export function computeDecision(input: DecisionInput): {
  verdict: Verdict;
  scores: SignalScores;
  outputMatchOverride: number;
  decisionReason: string;
} {
  const { staticIssues, hasSyntaxError, hasSecurityIssue, executionError, expectedOutput, executionOutput, aiScores } = input;

  // Start from AI scores, but clamp and override based on hard signals
  let scores: SignalScores = {
    overall: 0,
    logic: normalizeScore(aiScores.logic, 50),
    syntax: normalizeScore(aiScores.syntax, 50),
    quality: normalizeScore(aiScores.quality, 50),
    efficiency: normalizeScore(aiScores.efficiency, 50),
    bestPractices: normalizeScore(aiScores.bestPractices, 50),
    outputMatch: normalizeScore(aiScores.outputMatch, 50),
    readability: normalizeScore(aiScores.readability, 50),
  };

  let reasons: string[] = [];

  // Syntax is critical
  if (hasSyntaxError) {
    scores.syntax = Math.min(scores.syntax, 30);
    scores.logic = Math.min(scores.logic, 40);
    reasons.push("Static analysis detected a syntax error.");
  }

  // Security issues are critical
  if (hasSecurityIssue) {
    scores.bestPractices = Math.min(scores.bestPractices, 20);
    scores.quality = Math.min(scores.quality, 30);
    reasons.push("Security risk detected (unsafe imports or destructive SQL).");
  }

  // Static issues reduce quality / best practices
  const criticalStatic = staticIssues.filter((i) => i.severity === "critical").length;
  const warningStatic = staticIssues.filter((i) => i.severity === "warning").length;
  if (criticalStatic > 0 || warningStatic > 0) {
    const qualityPenalty = Math.min(30, criticalStatic * 15 + warningStatic * 5);
    scores.quality = Math.max(0, scores.quality - qualityPenalty);
    scores.bestPractices = Math.max(0, scores.bestPractices - qualityPenalty);
  }

  // Execution error strongly affects logic and output match
  if (executionError) {
    scores.logic = Math.min(scores.logic, 35);
    scores.outputMatch = Math.min(scores.outputMatch, 20);
    reasons.push("Execution produced an error.");
  }

  // Output comparison
  let outputMatchOverride = scores.outputMatch;
  if (expectedOutput?.trim()) {
    outputMatchOverride = compareOutputs(executionOutput, expectedOutput);
    scores.outputMatch = Math.round((scores.outputMatch * 0.3 + outputMatchOverride * 0.7));
    if (outputMatchOverride >= 95) {
      scores.logic = Math.max(scores.logic, 70);
    } else if (outputMatchOverride < 40) {
      scores.logic = Math.min(scores.logic, 50);
      reasons.push("Execution output does not match expected output.");
    }
  }

  // Compute overall as weighted average
  const overall = Math.round(
    scores.logic * 0.25 +
      scores.syntax * 0.15 +
      scores.quality * 0.15 +
      scores.efficiency * 0.1 +
      scores.bestPractices * 0.1 +
      scores.outputMatch * 0.15 +
      scores.readability * 0.1,
  );

  // Override AI verdict with hard rules
  let verdict: Verdict = aiScores.overall != null && aiScores.overall >= 70 ? "accepted" : "rejected";
  if (input.aiVerdict === "accepted" && overall >= 65 && !hasSyntaxError && !hasSecurityIssue && !executionError) {
    verdict = "accepted";
  } else {
    verdict = "rejected";
  }

  // Hard rejection rules
  if (hasSyntaxError || hasSecurityIssue || executionError) {
    verdict = "rejected";
  }

  // Hard acceptance rule
  if (!hasSyntaxError && !hasSecurityIssue && !executionError && outputMatchOverride >= 95 && overall >= 75) {
    verdict = "accepted";
  }

  scores.overall = overall;

  const decisionReason = reasons.length > 0 ? reasons.join(" ") : "Decision based on combined static, execution and AI signals.";

  return { verdict, scores, outputMatchOverride, decisionReason };
}

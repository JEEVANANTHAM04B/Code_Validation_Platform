export type Language = "python" | "sql";

export type Verdict = "accepted" | "rejected";

export type Difficulty = "Easy" | "Medium" | "Hard" | "Expert";

export type Severity = "critical" | "warning" | "info";

export interface CodeIssue {
  severity: Severity;
  category: string;
  line: number | null;
  title: string;
  detail: string;
  fix: string;
}

export interface ValidationReport {
  verdict: Verdict;
  summary: string;
  problemType: string[];
  questionUnderstanding: string;
  approachUsed: string;
  edgeCases: string[];
  scores: {
    overall: number;
    logic: number;
    syntax: number;
    quality: number;
    efficiency: number;
    bestPractices: number;
    outputMatch: number;
    readability: number;
  };
  execution: {
    output: string;
    error: string | null;
    estimatedTimeMs: number;
    estimatedMemoryKb: number;
    note: string;
  };
  complexity: {
    time: string;
    space: string;
    timeExplanation: string;
    spaceExplanation: string;
  };
  difficulty: {
    level: Difficulty;
    score: number;
    reasons: string[];
  };
  issues: CodeIssue[];
  whatIsWrong: string[];
  howToFix: string[];
  betterApproach: string;
  alternativeSolution: string;
  industryStandardSolution: string;
  suggestions: {
    cleaner: string;
    optimized: string;
    beginner: string;
    intermediate: string;
    advanced: string;
    production: string;
  };
  learning: {
    concepts: string[];
    interviewTips: string[];
    interviewQuestions: string[];
    commonMistakes: string[];
    bestPractices: string[];
  };
}

export interface ValidationInput {
  question: string;
  expectedOutput?: string | undefined;
  code: string;
  language: Language;
  employeeName: string;
  employeeCode: string;
  department: string;
}

export const DEPARTMENTS = [
  "Engineering",
  "Data Engineering",
  "Data Science",
  "Backend",
  "Frontend",
  "QA",
  "DevOps",
  "Analytics",
] as const;

export const DIFFICULTIES: Difficulty[] = ["Easy", "Medium", "Hard", "Expert"];

export function verdictLabel(verdict: Verdict) {
  return verdict === "accepted" ? "Accepted" : "Rejected";
}

export function scoreTone(score: number) {
  if (score >= 80) return "success" as const;
  if (score >= 55) return "warning" as const;
  return "destructive" as const;
}

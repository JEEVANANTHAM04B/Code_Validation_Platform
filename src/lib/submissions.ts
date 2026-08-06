import { supabase } from "@/integrations/supabase/client";
import type { Difficulty, Language, ValidationReport, Verdict } from "@/lib/validation-types";

export interface SubmissionRow {
  id: string;
  employee_name: string;
  employee_code: string;
  department: string;
  language: Language;
  question: string;
  expected_output: string | null;
  code: string;
  verdict: Verdict;
  overall_score: number;
  logic_score: number;
  syntax_score: number;
  quality_score: number;
  efficiency_score: number;
  best_practices_score: number;
  output_match_score: number;
  readability_score: number;
  difficulty: Difficulty;
  difficulty_score: number;
  time_complexity: string;
  space_complexity: string;
  execution_time_ms: number;
  problem_type: string[];
  execution_output: string | null;
  execution_error: string | null;
  reviewer_notes: string | null;
  report: ValidationReport;
  created_at: string;
}

export async function fetchSubmissions(): Promise<SubmissionRow[]> {
  const { data, error } = await supabase
    .from("submissions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data ?? []) as unknown as SubmissionRow[];
}

export async function fetchSubmission(id: string): Promise<SubmissionRow | null> {
  const { data, error } = await supabase.from("submissions").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as unknown as SubmissionRow | null) ?? null;
}

export async function insertSubmission(payload: {
  employeeName: string;
  employeeCode: string;
  department: string;
  language: Language;
  question: string;
  expectedOutput?: string | undefined;
  code: string;
  report: ValidationReport;
}) {
  const { report } = payload;
  const { data, error } = await supabase
    .from("submissions")
    .insert({
      employee_name: payload.employeeName,
      employee_code: payload.employeeCode,
      department: payload.department,
      language: payload.language,
      question: payload.question,
      expected_output: payload.expectedOutput ?? null,
      code: payload.code,
      verdict: report.verdict,
      overall_score: report.scores.overall,
      logic_score: report.scores.logic,
      syntax_score: report.scores.syntax,
      quality_score: report.scores.quality,
      efficiency_score: report.scores.efficiency,
      best_practices_score: report.scores.bestPractices,
      output_match_score: report.scores.outputMatch,
      readability_score: report.scores.readability,
      difficulty: report.difficulty.level,
      difficulty_score: report.difficulty.score,
      time_complexity: report.complexity.time,
      space_complexity: report.complexity.space,
      execution_time_ms: report.execution.estimatedTimeMs,
      problem_type: report.problemType,
      execution_output: report.execution.output,
      execution_error: report.execution.error,
      report: JSON.parse(JSON.stringify(report)),
    })
    .select("id")
    .single();
  if (error) throw error;
  return data as { id: string };
}

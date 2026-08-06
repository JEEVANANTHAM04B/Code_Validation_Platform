CREATE TABLE public.submissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_name text NOT NULL,
  employee_code text NOT NULL,
  department text NOT NULL,
  language text NOT NULL CHECK (language IN ('python','sql')),
  question text NOT NULL,
  expected_output text,
  code text NOT NULL,
  verdict text NOT NULL CHECK (verdict IN ('accepted','rejected')),
  overall_score int NOT NULL DEFAULT 0,
  logic_score int NOT NULL DEFAULT 0,
  syntax_score int NOT NULL DEFAULT 0,
  quality_score int NOT NULL DEFAULT 0,
  efficiency_score int NOT NULL DEFAULT 0,
  best_practices_score int NOT NULL DEFAULT 0,
  output_match_score int NOT NULL DEFAULT 0,
  readability_score int NOT NULL DEFAULT 0,
  difficulty text NOT NULL DEFAULT 'Easy',
  difficulty_score int NOT NULL DEFAULT 0,
  time_complexity text NOT NULL DEFAULT 'O(n)',
  space_complexity text NOT NULL DEFAULT 'O(1)',
  execution_time_ms int NOT NULL DEFAULT 0,
  problem_type text[] NOT NULL DEFAULT '{}',
  execution_output text,
  execution_error text,
  reviewer_notes text,
  report jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.submissions TO authenticated;
GRANT SELECT, INSERT ON public.submissions TO anon;
GRANT ALL ON public.submissions TO service_role;

ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view submissions" ON public.submissions FOR SELECT USING (true);
CREATE POLICY "Anyone can create submissions" ON public.submissions FOR INSERT WITH CHECK (true);

CREATE INDEX submissions_created_at_idx ON public.submissions (created_at DESC);
CREATE INDEX submissions_employee_code_idx ON public.submissions (employee_code);
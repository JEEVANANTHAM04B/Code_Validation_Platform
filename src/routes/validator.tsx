import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Play, RotateCcw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { CodeEditor } from "@/components/code-editor";
import { ValidationReportView } from "@/components/validation-report-view";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { insertSubmission } from "@/lib/submissions";
import { validateSubmission } from "@/lib/validation.functions";
import { DEPARTMENTS, type Language, type ValidationReport } from "@/lib/validation-types";

export const Route = createFileRoute("/validator")({
  head: () => ({
    meta: [
      { title: "Code Validator | Smart Code Validator" },
      {
        name: "description",
        content:
          "Submit a Python or SQL solution and get an AI code review with scores, complexity analysis, difficulty estimation and optimized rewrites.",
      },
      { property: "og:title", content: "Code Validator | Smart Code Validator" },
      {
        property: "og:description",
        content: "AI code review with scoring, complexity analysis and optimized solutions.",
      },
    ],
  }),
  component: ValidatorPage,
});

const PYTHON_STARTER = `def find_duplicates(numbers):
    seen = set()
    duplicates = set()
    for number in numbers:
        if number in seen:
            duplicates.add(number)
        seen.add(number)
    return sorted(duplicates)


print(find_duplicates([1, 2, 3, 2, 5, 1, 7]))
`;

const SQL_STARTER = `SELECT department, COUNT(*) AS employee_count
FROM employees
GROUP BY department
HAVING COUNT(*) > 1
ORDER BY employee_count DESC;
`;

function ValidatorPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const validate = useServerFn(validateSubmission);

  const [question, setQuestion] = useState(
    "Write a Python program to find duplicate numbers in a list.",
  );
  const [expectedOutput, setExpectedOutput] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [employeeCode, setEmployeeCode] = useState("");
  const [department, setDepartment] = useState<string>(DEPARTMENTS[0]);
  const [language, setLanguage] = useState<Language>("python");
  const [code, setCode] = useState(PYTHON_STARTER);
  const [report, setReport] = useState<ValidationReport | null>(null);
  const [reviewedCode, setReviewedCode] = useState("");
  const [reviewedLanguage, setReviewedLanguage] = useState<Language>("python");

  const switchLanguage = (next: Language) => {
    setLanguage(next);
    const untouched = code.trim() === PYTHON_STARTER.trim() || code.trim() === SQL_STARTER.trim();
    if (untouched) setCode(next === "python" ? PYTHON_STARTER : SQL_STARTER);
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const result = await validate({
        data: {
          question: question.trim(),
          expectedOutput: expectedOutput.trim() || undefined,
          code,
          language,
          employeeName: employeeName.trim(),
          employeeCode: employeeCode.trim(),
          department,
        },
      });
      await insertSubmission({
        employeeName: employeeName.trim(),
        employeeCode: employeeCode.trim(),
        department,
        language,
        question: question.trim(),
        expectedOutput: expectedOutput.trim() || undefined,
        code,
        report: result,
      });
      return result;
    },
    onSuccess: (result) => {
      setReport(result);
      setReviewedCode(code);
      setReviewedLanguage(language);
      void queryClient.invalidateQueries({ queryKey: ["submissions"] });
      toast.success(
        result.verdict === "accepted"
          ? `Accepted — score ${result.scores.overall}/100`
          : `Rejected — score ${result.scores.overall}/100`,
      );
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Validation failed.";
      toast.error(message.includes("402") ? "AI credits exhausted for this workspace." : message);
    },
  });

  const canSubmit =
    question.trim().length >= 10 &&
    code.trim().length > 0 &&
    employeeName.trim().length >= 2 &&
    employeeCode.trim().length >= 1;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">
            <span className="text-gradient">Code validator</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter the question, the employee details and the submitted solution. The AI reviewer analyses
            logic, traces execution, scores quality and suggests better implementations.
          </p>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Programming question</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                rows={4}
                maxLength={4000}
                placeholder="Write a Python program to find duplicate numbers in a list."
                className="resize-y text-sm"
              />
              <div className="space-y-2">
                <Label htmlFor="expected">Expected output (optional)</Label>
                <Textarea
                  id="expected"
                  value={expectedOutput}
                  onChange={(event) => setExpectedOutput(event.target.value)}
                  rows={3}
                  maxLength={4000}
                  placeholder="[1, 2]"
                  className="resize-y font-mono text-sm"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base">Solution</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => setCode(language === "python" ? PYTHON_STARTER : SQL_STARTER)}
              >
                <RotateCcw className="size-3.5" /> Reset sample
              </Button>
            </CardHeader>
            <CardContent>
              <CodeEditor value={code} onChange={setCode} language={language} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Employee information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Employee name</Label>
                <Input
                  id="name"
                  value={employeeName}
                  onChange={(event) => setEmployeeName(event.target.value)}
                  maxLength={80}
                  placeholder="Aarav Sharma"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Employee ID</Label>
                <Input
                  id="code"
                  value={employeeCode}
                  onChange={(event) => setEmployeeCode(event.target.value)}
                  maxLength={40}
                  placeholder="EMP-1042"
                />
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                <Select value={department} onValueChange={setDepartment}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Programming language</Label>
                <Select value={language} onValueChange={(value) => switchLanguage(value as Language)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="python">Python</SelectItem>
                    <SelectItem value="sql">SQL</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                className="w-full gap-2"
                size="lg"
                disabled={!canSubmit || mutation.isPending}
                onClick={() => mutation.mutate()}
              >
                {mutation.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Validating…
                  </>
                ) : (
                  <>
                    <Play className="size-4" /> Validate
                  </>
                )}
              </Button>
              {!canSubmit && (
                <p className="text-xs text-muted-foreground">
                  Question, employee name, employee ID and code are required.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Validation pipeline</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-2 text-sm text-muted-foreground">
                {[
                  "Question analysis & problem classification",
                  "Static analysis of the submitted code",
                  "Execution trace (AI-simulated) & output capture",
                  "AI logic & correctness validation",
                  "Scoring, complexity and difficulty",
                  "Improved solutions & learning feedback",
                ].map((step, index) => (
                  <li key={step} className="flex gap-2.5">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-semibold text-primary">
                      {index + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>

      {mutation.isPending && (
        <div className="panel flex items-center gap-3 p-6 text-sm text-muted-foreground">
          <Loader2 className="size-5 animate-spin text-primary" />
          The AI reviewer is analysing the question, tracing execution and scoring the submission. This can
          take up to a minute.
        </div>
      )}

      {report && (
        <>
          <ValidationReportView
            report={report}
            language={reviewedLanguage}
            submittedCode={reviewedCode}
          />
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => navigate({ to: "/history" })}>
              Open history
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

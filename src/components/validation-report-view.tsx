import {
  AlertTriangle,
  BadgeCheck,
  BookOpen,
  Boxes,
  Brain,
  CircleX,
  Clock,
  Cpu,
  Gauge,
  Info,
  Lightbulb,
  Terminal,
} from "lucide-react";

import { CodeBlock } from "@/components/code-block";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { CodeIssue, Language, ValidationReport } from "@/lib/validation-types";

function toneClass(score: number) {
  if (score >= 80) return "text-success";
  if (score >= 55) return "text-warning";
  return "text-destructive";
}

function ScoreRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className={cn("font-semibold tabular-nums", toneClass(value))}>{value}</span>
      </div>
      <Progress value={value} className="h-1.5" />
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="panel p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </div>
      <p className="mt-2 font-mono text-lg font-semibold">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

const severityStyles: Record<CodeIssue["severity"], string> = {
  critical: "border-destructive/40 bg-destructive/10 text-destructive",
  warning: "border-warning/40 bg-warning/10 text-warning",
  info: "border-info/40 bg-info/10 text-info",
};

function BulletList({ items }: { items: string[] }) {
  if (items.length === 0) return <p className="text-sm text-muted-foreground">Nothing reported.</p>;
  return (
    <ul className="space-y-2 text-sm text-foreground/90">
      {items.map((item, index) => (
        <li key={index} className="flex gap-2">
          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function ValidationReportView({
  report,
  language,
  submittedCode,
}: {
  report: ValidationReport;
  language: Language;
  submittedCode?: string;
}) {
  const accepted = report.verdict === "accepted";

  return (
    <div className="space-y-6">
      <div
        className={cn(
          "panel relative overflow-hidden p-6 animate-in fade-in slide-in-from-bottom-2 duration-500",
          accepted ? "shadow-glow" : "",
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "flex size-11 items-center justify-center rounded-xl",
                  accepted ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive",
                )}
              >
                {accepted ? <BadgeCheck className="size-6" /> : <CircleX className="size-6" />}
              </span>
              <div>
                <h2 className={cn("text-2xl font-bold", accepted ? "text-success" : "text-destructive")}>
                  {accepted ? "Accepted" : "Rejected"}
                </h2>
                <p className="text-sm text-muted-foreground">{report.summary}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="font-mono uppercase">
                {language}
              </Badge>
              <Badge variant="outline">
                {report.difficulty.level} · {report.difficulty.score}/100
              </Badge>
              {report.problemType.map((type) => (
                <Badge key={type} variant="outline" className="border-primary/40 text-primary">
                  {type}
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex flex-col items-center rounded-2xl border border-border bg-secondary/40 px-7 py-4">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">AI Score</span>
            <span className={cn("text-4xl font-bold tabular-nums", toneClass(report.scores.overall))}>
              {report.scores.overall}
            </span>
            <span className="text-xs text-muted-foreground">out of 100</span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={Clock}
          label="Execution time"
          value={`${report.execution.estimatedTimeMs} ms`}
          hint="AI-estimated"
        />
        <MetricCard
          icon={Cpu}
          label="Memory"
          value={`${report.execution.estimatedMemoryKb} KB`}
          hint="AI-estimated"
        />
        <MetricCard icon={Gauge} label="Time complexity" value={report.complexity.time} />
        <MetricCard icon={Boxes} label="Space complexity" value={report.complexity.space} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Score breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ScoreRow label="Logic" value={report.scores.logic} />
            <ScoreRow label="Syntax" value={report.scores.syntax} />
            <ScoreRow label="Code quality" value={report.scores.quality} />
            <ScoreRow label="Efficiency" value={report.scores.efficiency} />
            <ScoreRow label="Best practices" value={report.scores.bestPractices} />
            <ScoreRow label="Output match" value={report.scores.outputMatch} />
            <ScoreRow label="Readability" value={report.scores.readability} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Terminal className="size-4" /> Execution result
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <CodeBlock code={report.execution.output} label="stdout" />
            {report.execution.error && (
              <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-destructive">Error</p>
                <pre className="overflow-auto font-mono text-xs text-destructive">{report.execution.error}</pre>
              </div>
            )}
            {report.execution.note && (
              <p className="flex gap-2 text-xs text-muted-foreground">
                <Info className="mt-0.5 size-3.5 shrink-0" />
                {report.execution.note}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="analysis">
        <TabsList className="flex-wrap">
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
          <TabsTrigger value="issues">Issues ({report.issues.length})</TabsTrigger>
          <TabsTrigger value="complexity">Complexity & difficulty</TabsTrigger>
          <TabsTrigger value="solutions">AI solutions</TabsTrigger>
          <TabsTrigger value="learning">Learning</TabsTrigger>
          {submittedCode && <TabsTrigger value="code">Submitted code</TabsTrigger>}
        </TabsList>

        <TabsContent value="analysis" className="mt-4 grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Brain className="size-4" /> Question understanding
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-foreground/90">
              <p>{report.questionUnderstanding || "Not provided."}</p>
              <div>
                <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Approach used</p>
                <p>{report.approachUsed || "Not provided."}</p>
              </div>
              <div>
                <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Edge cases</p>
                <BulletList items={report.edgeCases} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="size-4" /> What went wrong & how to fix
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Mistakes</p>
                <BulletList items={report.whatIsWrong} />
              </div>
              <div>
                <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Fixes</p>
                <BulletList items={report.howToFix} />
              </div>
              <div>
                <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Better approach</p>
                <p className="text-sm text-foreground/90">{report.betterApproach || "Not provided."}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="issues" className="mt-4 space-y-3">
          {report.issues.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                No static-analysis issues found.
              </CardContent>
            </Card>
          ) : (
            report.issues.map((issue, index) => (
              <div key={index} className={cn("rounded-xl border p-4", severityStyles[issue.severity])}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold">{issue.title}</span>
                  <Badge variant="outline" className="text-[10px] uppercase">
                    {issue.severity}
                  </Badge>
                  <Badge variant="secondary" className="text-[10px]">
                    {issue.category}
                  </Badge>
                  {issue.line != null && (
                    <span className="font-mono text-xs text-muted-foreground">line {issue.line}</span>
                  )}
                </div>
                <p className="mt-2 text-sm text-foreground/85">{issue.detail}</p>
                {issue.fix && (
                  <p className="mt-2 text-sm text-foreground/70">
                    <span className="font-semibold">Fix: </span>
                    {issue.fix}
                  </p>
                )}
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="complexity" className="mt-4 grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Complexity analysis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-foreground/90">
              <div>
                <p className="font-mono text-lg font-semibold text-primary">{report.complexity.time}</p>
                <p className="mt-1">{report.complexity.timeExplanation}</p>
              </div>
              <div>
                <p className="font-mono text-lg font-semibold text-primary">{report.complexity.space}</p>
                <p className="mt-1">{report.complexity.spaceExplanation}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Difficulty estimation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold text-primary">{report.difficulty.level}</span>
                <span className="font-mono text-sm text-muted-foreground">
                  {report.difficulty.score}/100
                </span>
              </div>
              <Progress value={report.difficulty.score} className="h-2" />
              <BulletList items={report.difficulty.reasons} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="solutions" className="mt-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Lightbulb className="size-4" /> Suggested implementations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="optimized">
                <TabsList className="flex-wrap">
                  <TabsTrigger value="cleaner">Cleaner</TabsTrigger>
                  <TabsTrigger value="optimized">Optimized</TabsTrigger>
                  <TabsTrigger value="beginner">Beginner</TabsTrigger>
                  <TabsTrigger value="intermediate">Intermediate</TabsTrigger>
                  <TabsTrigger value="advanced">Advanced</TabsTrigger>
                  <TabsTrigger value="production">Production</TabsTrigger>
                </TabsList>
                {(
                  [
                    ["cleaner", report.suggestions.cleaner],
                    ["optimized", report.suggestions.optimized],
                    ["beginner", report.suggestions.beginner],
                    ["intermediate", report.suggestions.intermediate],
                    ["advanced", report.suggestions.advanced],
                    ["production", report.suggestions.production],
                  ] as const
                ).map(([key, code]) => (
                  <TabsContent key={key} value={key} className="mt-4">
                    <CodeBlock code={code} label={`${key} · ${language}`} />
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Alternative solution</CardTitle>
              </CardHeader>
              <CardContent>
                <CodeBlock code={report.alternativeSolution} label="alternative" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Industry standard solution</CardTitle>
              </CardHeader>
              <CardContent>
                <CodeBlock code={report.industryStandardSolution} label="industry standard" />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="learning" className="mt-4 grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BookOpen className="size-4" /> Concepts & best practices
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Concepts used</p>
                <BulletList items={report.learning.concepts} />
              </div>
              <div>
                <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Best practices</p>
                <BulletList items={report.learning.bestPractices} />
              </div>
              <div>
                <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Common mistakes</p>
                <BulletList items={report.learning.commonMistakes} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Interview preparation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Tips</p>
                <BulletList items={report.learning.interviewTips} />
              </div>
              <div>
                <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
                  Possible interview questions
                </p>
                <BulletList items={report.learning.interviewQuestions} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {submittedCode && (
          <TabsContent value="code" className="mt-4">
            <CodeBlock code={submittedCode} label={`submission · ${language}`} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

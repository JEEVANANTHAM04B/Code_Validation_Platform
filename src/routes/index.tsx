import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ArrowRight,
  BadgeCheck,
  CircleX,
  Code2,
  Gauge,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchSubmissions, type SubmissionRow } from "@/lib/submissions";
import { DIFFICULTIES } from "@/lib/validation-types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard | Smart Code Validator" },
      {
        name: "description",
        content:
          "Track Python and SQL code submissions, acceptance rate, AI quality scores and difficulty distribution across your engineering team.",
      },
      { property: "og:title", content: "Dashboard | Smart Code Validator" },
      {
        property: "og:description",
        content: "AI-powered validation metrics for Python and SQL code submissions.",
      },
    ],
  }),
  component: DashboardPage,
});

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "primary",
}: {
  icon: typeof Users;
  label: string;
  value: string | number;
  hint?: string;
  tone?: "primary" | "success" | "destructive" | "warning";
}) {
  const toneMap = {
    primary: "bg-primary/15 text-primary",
    success: "bg-success/15 text-success",
    destructive: "bg-destructive/15 text-destructive",
    warning: "bg-warning/15 text-warning",
  } as const;

  return (
    <div className="panel p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-bold tabular-nums">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        <span className={`flex size-10 items-center justify-center rounded-xl ${toneMap[tone]}`}>
          <Icon className="size-5" />
        </span>
      </div>
    </div>
  );
}

function computeStats(rows: SubmissionRow[]) {
  const total = rows.length;
  const accepted = rows.filter((r) => r.verdict === "accepted").length;
  const rejected = total - accepted;
  const employees = new Set(rows.map((r) => r.employee_code.toLowerCase())).size;
  const avgScore = total === 0 ? 0 : Math.round(rows.reduce((sum, r) => sum + r.overall_score, 0) / total);
  const python = rows.filter((r) => r.language === "python").length;
  const sql = total - python;
  const successRate = total === 0 ? 0 : Math.round((accepted / total) * 100);
  const difficulty = DIFFICULTIES.map((level) => ({
    level,
    count: rows.filter((r) => r.difficulty === level).length,
  }));
  return { total, accepted, rejected, employees, avgScore, python, sql, successRate, difficulty };
}

function DashboardPage() {
  const { data, isLoading } = useQuery({ queryKey: ["submissions"], queryFn: fetchSubmissions });
  const rows = data ?? [];
  const stats = computeStats(rows);

  const languageData = [
    { name: "Python", value: stats.python, fill: "var(--color-chart-1)" },
    { name: "SQL", value: stats.sql, fill: "var(--color-chart-5)" },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">
            <span className="text-gradient">Validation dashboard</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            AI-reviewed Python and SQL submissions across the engineering organization.
          </p>
        </div>
        <Button asChild>
          <Link to="/validator">
            New validation <ArrowRight className="size-4" />
          </Link>
        </Button>
      </header>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard icon={Code2} label="Total submissions" value={stats.total} />
            <StatCard icon={BadgeCheck} label="Accepted" value={stats.accepted} tone="success" />
            <StatCard icon={CircleX} label="Rejected" value={stats.rejected} tone="destructive" />
            <StatCard
              icon={Activity}
              label="Pending validations"
              value={0}
              hint="Validations run synchronously"
              tone="warning"
            />
            <StatCard
              icon={Gauge}
              label="Avg. quality score"
              value={`${stats.avgScore}/100`}
              tone="primary"
            />
            <StatCard icon={Users} label="Employees" value={stats.employees} />
            <StatCard
              icon={BadgeCheck}
              label="Success rate"
              value={`${stats.successRate}%`}
              tone="success"
            />
            <StatCard
              icon={Code2}
              label="Language split"
              value={`${stats.python} / ${stats.sql}`}
              hint="Python / SQL"
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-base">Language usage</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                {languageData.length === 0 ? (
                  <p className="pt-16 text-center text-sm text-muted-foreground">No data yet.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={languageData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90}>
                        {languageData.map((entry) => (
                          <Cell key={entry.name} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: "var(--color-popover)",
                          border: "1px solid var(--color-border)",
                          borderRadius: "0.75rem",
                          color: "var(--color-foreground)",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Difficulty distribution</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.difficulty}>
                    <XAxis dataKey="level" stroke="var(--color-muted-foreground)" fontSize={12} />
                    <YAxis allowDecimals={false} stroke="var(--color-muted-foreground)" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        background: "var(--color-popover)",
                        border: "1px solid var(--color-border)",
                        borderRadius: "0.75rem",
                        color: "var(--color-foreground)",
                      }}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]} fill="var(--color-chart-1)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base">Recent submissions</CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link to="/history">View all</Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {rows.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No submissions yet — run your first validation.
                </p>
              ) : (
                rows.slice(0, 6).map((row) => (
                  <Link
                    key={row.id}
                    to="/history/$id"
                    params={{ id: row.id }}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-secondary/30 px-4 py-3 transition-colors hover:border-primary/50 hover:bg-secondary/60"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{row.question}</p>
                      <p className="text-xs text-muted-foreground">
                        {row.employee_name} · {row.employee_code} · {row.department}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="font-mono uppercase">
                        {row.language}
                      </Badge>
                      <Badge variant="outline">{row.difficulty}</Badge>
                      <div className="w-24">
                        <Progress value={row.overall_score} className="h-1.5" />
                      </div>
                      <Badge
                        className={
                          row.verdict === "accepted"
                            ? "bg-success/15 text-success"
                            : "bg-destructive/15 text-destructive"
                        }
                      >
                        {row.verdict === "accepted" ? "Accepted" : "Rejected"}
                      </Badge>
                    </div>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchSubmissions } from "@/lib/submissions";

export const Route = createFileRoute("/history/")({
  head: () => ({
    meta: [
      { title: "Submission History | Smart Code Validator" },
      {
        name: "description",
        content:
          "Browse every validated Python and SQL submission with verdicts, scores, difficulty and employee details.",
      },
      { property: "og:title", content: "Submission History | Smart Code Validator" },
      {
        property: "og:description",
        content: "Full audit trail of AI-validated code submissions.",
      },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  const { data, isLoading } = useQuery({ queryKey: ["submissions"], queryFn: fetchSubmissions });
  const [search, setSearch] = useState("");
  const [language, setLanguage] = useState("all");
  const [verdict, setVerdict] = useState("all");

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (data ?? []).filter((row) => {
      if (language !== "all" && row.language !== language) return false;
      if (verdict !== "all" && row.verdict !== verdict) return false;
      if (!term) return true;
      return (
        row.question.toLowerCase().includes(term) ||
        row.employee_name.toLowerCase().includes(term) ||
        row.employee_code.toLowerCase().includes(term) ||
        row.department.toLowerCase().includes(term)
      );
    });
  }, [data, search, language, verdict]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">
          <span className="text-gradient">Submission history</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every validated submission with its verdict, score and AI report.
        </p>
      </header>

      <Card>
        <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">{rows.length} submissions</CardTitle>
          <div className="flex flex-wrap gap-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search question, employee…"
                className="w-60 pl-9"
              />
            </div>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All languages</SelectItem>
                <SelectItem value="python">Python</SelectItem>
                <SelectItem value="sql">SQL</SelectItem>
              </SelectContent>
            </Select>
            <Select value={verdict} onValueChange={setVerdict}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All verdicts</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
          ) : rows.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No submissions match these filters.
            </p>
          ) : (
            rows.map((row) => (
              <Link
                key={row.id}
                to="/history/$id"
                params={{ id: row.id }}
                className="block rounded-xl border border-border bg-secondary/30 p-4 transition-colors hover:border-primary/50 hover:bg-secondary/60"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{row.question}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {row.employee_name} · {row.employee_code} · {row.department} ·{" "}
                      {new Date(row.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="font-mono uppercase">
                      {row.language}
                    </Badge>
                    <Badge variant="outline">{row.difficulty}</Badge>
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
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <Progress value={row.overall_score} className="h-1.5 flex-1" />
                  <span className="w-16 text-right text-sm font-semibold tabular-nums">
                    {row.overall_score}/100
                  </span>
                </div>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

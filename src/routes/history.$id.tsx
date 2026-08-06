import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";

import { ValidationReportView } from "@/components/validation-report-view";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchSubmission } from "@/lib/submissions";

export const Route = createFileRoute("/history/$id")({
  head: () => ({
    meta: [
      { title: "Validation Report | Smart Code Validator" },
      {
        name: "description",
        content:
          "Detailed AI validation report with scores, execution trace, complexity analysis and improved solutions.",
      },
      { property: "og:title", content: "Validation Report | Smart Code Validator" },
      {
        property: "og:description",
        content: "Detailed AI code review for a single submission.",
      },
    ],
  }),
  component: SubmissionDetailPage,
});

function SubmissionDetailPage() {
  const { id } = Route.useParams();
  const { data, isLoading, error } = useQuery({
    queryKey: ["submission", id],
    queryFn: async () => {
      const row = await fetchSubmission(id);
      if (!row) throw notFound();
      return row;
    },
  });

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="gap-1.5">
        <Link to="/history">
          <ArrowLeft className="size-4" /> Back to history
        </Link>
      </Button>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      ) : error || !data ? (
        <p className="panel p-8 text-center text-sm text-muted-foreground">
          This submission could not be found.
        </p>
      ) : (
        <>
          <header className="panel space-y-3 p-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="font-mono uppercase">
                {data.language}
              </Badge>
              <Badge variant="outline">{data.difficulty}</Badge>
              <Badge
                className={
                  data.verdict === "accepted"
                    ? "bg-success/15 text-success"
                    : "bg-destructive/15 text-destructive"
                }
              >
                {data.verdict === "accepted" ? "Accepted" : "Rejected"}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {new Date(data.created_at).toLocaleString()}
              </span>
            </div>
            <h1 className="text-2xl font-bold leading-snug">{data.question}</h1>
            <p className="text-sm text-muted-foreground">
              {data.employee_name} · {data.employee_code} · {data.department}
            </p>
            {data.expected_output && (
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Expected output
                </p>
                <pre className="mt-1 overflow-x-auto rounded-lg bg-secondary/40 p-3 font-mono text-xs">
                  {data.expected_output}
                </pre>
              </div>
            )}
          </header>

          <ValidationReportView
            report={data.report}
            language={data.language}
            submittedCode={data.code}
          />
        </>
      )}
    </div>
  );
}

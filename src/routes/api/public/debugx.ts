import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/debugx")({
  server: {
    handlers: {
      GET: async () => {
        const results: Record<string, string> = {};
        for (const [name, load] of [
          ["report-export", () => import("@/lib/report-export.server")],
          ["submissions", () => import("@/lib/submissions")],
          ["validation-schema", () => import("@/lib/validation-schema")],
          ["validation.server", () => import("@/lib/validation.server")],
        ] as const) {
          try {
            await load();
            results[name] = "ok";
          } catch (error) {
            results[name] = error instanceof Error ? error.message : String(error);
          }
        }
        return Response.json(results);
      },
    },
  },
});

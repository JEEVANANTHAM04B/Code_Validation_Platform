import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/debugx")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const { runValidationEngine } = await import("@/lib/validation.server");
          const r = await runValidationEngine({
            question: "Write a Python program to find duplicate numbers in a list.",
            code: "print(1)",
            language: "python",
            employeeName: "T",
            employeeCode: "E1",
            department: "Engineering",
          } as never);
          return Response.json({ ok: true, verdict: (r as { verdict: string }).verdict });
        } catch (error) {
          return Response.json({
            ok: false,
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
          });
        }
      },
    },
  },
});

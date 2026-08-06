import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { generateDocxReport, generatePdfReport } from "./report-export.server";
import { fetchSubmission } from "./submissions";
import { validationInputSchema } from "./validation-schema";
import { runValidationEngine } from "./validation.server";

export const validateSubmission = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => validationInputSchema.parse(input))
  .handler(async ({ data }) => runValidationEngine(data));

const exportSubmissionSchema = z.object({
  submissionId: z.string().uuid(),
  format: z.enum(["pdf", "docx"]),
});

export const exportSubmissionReport = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => exportSubmissionSchema.parse(input))
  .handler(async ({ data }) => {
    const row = await fetchSubmission(data.submissionId);
    if (!row) throw new Error("Submission not found");

    const submission = {
      id: row.id,
      employeeName: row.employee_name,
      employeeCode: row.employee_code,
      department: row.department,
      language: row.language,
      question: row.question,
      expectedOutput: row.expected_output,
      code: row.code,
      report: row.report,
      createdAt: row.created_at,
    };

    if (data.format === "docx") {
      const buffer = await generateDocxReport(submission);
      return {
        format: "docx" as const,
        filename: `validation-report-${row.employee_code}-${row.id}.docx`,
        base64: buffer.toString("base64"),
      };
    }

    const bytes = generatePdfReport(submission);
    return {
      format: "pdf" as const,
      filename: `validation-report-${row.employee_code}-${row.id}.pdf`,
      base64: Buffer.from(bytes).toString("base64"),
    };
  });

import { z } from "zod";

export const validationInputSchema = z.object({
  question: z.string().trim().min(10).max(4000),
  expectedOutput: z.string().trim().max(4000).optional(),
  code: z.string().trim().min(1).max(20000),
  language: z.enum(["python", "sql"]),
  employeeName: z.string().trim().min(2).max(80),
  employeeCode: z.string().trim().min(1).max(40),
  department: z.string().trim().min(2).max(60),
});

export type ValidationInputPayload = z.infer<typeof validationInputSchema>;

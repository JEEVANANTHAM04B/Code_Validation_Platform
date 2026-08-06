import { createServerFn } from "@tanstack/react-start";

import { validationInputSchema } from "./validation-schema";
import { runValidationEngine } from "./validation.server";

export const validateSubmission = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => validationInputSchema.parse(input))
  .handler(async ({ data }) => runValidationEngine(data));

import { runValidationEngine as runEngine } from "./validation-engine.server";
import type { ValidationInput, ValidationReport } from "./validation-types";

export { runValidationEngine };

async function runValidationEngine(input: ValidationInput): Promise<ValidationReport> {
  return runEngine(input);
}

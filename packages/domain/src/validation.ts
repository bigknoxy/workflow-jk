import { ZodSchema, ZodError } from "zod";

export interface ValidationResult {
  success: boolean;
  errors?: Array<{ path: string; message: string }>;
}

export function validateSchema<T>(schema: ZodSchema<T>, data: unknown): ValidationResult {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true };
  }
  return {
    success: false,
    errors: result.error.errors.map((e) => ({
      path: e.path.join("."),
      message: e.message,
    })),
  };
}

export class ContractViolationError extends Error {
  constructor(
    public readonly schemaName: string,
    public readonly errors: Array<{ path: string; message: string }>,
  ) {
    super(`Contract violation for ${schemaName}: ${errors.map((e) => `${e.path}: ${e.message}`).join(", ")}`);
    this.name = "ContractViolationError";
  }
}

export function assertValid<T>(schema: ZodSchema<T>, data: unknown, schemaName: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new ContractViolationError(schemaName, result.error.errors.map((e) => ({
      path: e.path.join("."),
      message: e.message,
    })));
  }
  return result.data;
}
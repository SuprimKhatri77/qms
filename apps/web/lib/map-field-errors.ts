import type { ValidationError } from "@repo/types";

export function mapFieldErrors(
  errors: ValidationError[],
): Partial<Record<string, string>> {
  return errors.reduce<Partial<Record<string, string>>>((acc, error) => {
    if (error.field && !acc[error.field]) {
      acc[error.field] = error.message;
    }
    return acc;
  }, {});
}

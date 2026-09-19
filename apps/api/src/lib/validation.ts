import { z } from "zod";
import {
  ErrorCode,
  type ApiErrorResponse,
  type ValidationError,
} from "@repo/types";

// Turns a zod failure into the error list every API response uses.
export function toValidationErrors(error: z.ZodError): ValidationError[] {
  return error.issues.map((issue) => ({
    field: issue.path.join(".") || "root",
    message: issue.message,
    code: issue.code,
  }));
}

type ParsedQuery<Schema extends z.ZodTypeAny> =
  | { success: true; data: z.output<Schema> }
  | { success: false; error: ApiErrorResponse };

// Validates ?query=params, like `validate` does for request bodies. Used from
// controllers as: `const query = parseQuery(schema, req.query)`.
export function parseQuery<Schema extends z.ZodTypeAny>(
  schema: Schema,
  query: unknown,
): ParsedQuery<Schema> {
  const result = schema.safeParse(query);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return {
    success: false,
    error: {
      success: false,
      message: "Invalid query parameters",
      code: ErrorCode.INVALID_QUERY_PARAM,
      errors: toValidationErrors(result.error),
    },
  };
}

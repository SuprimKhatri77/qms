import { z } from "zod";

export const ErrorCode = {
  INTERNAL_SERVER_ERROR: "INTERNAL_SERVER_ERROR",
  VALIDATION_FAILED: "VALIDATION_FAILED",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  INVALID_PAGE_PARAMETER: "INVALID_PAGE_PARAMETER",
  INVALID_ID_FORMAT: "INVALID_ID_FORMAT",
  INVALID_QUERY_PARAM: "INVALID_QUERY_PARAM",
  PAGE_NOT_FOUND: "PAGE_NOT_FOUND",
  DUPLICATE_ENTRY: "DUPLICATE_ENTRY",
  INVALID_REQUEST_PARAMS: "INVALID_REQUEST_PARAMS",
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export const validationErrorSchema = z.object({
  message: z.string(),
  field: z.string(),
  code: z.string(),
});

export type ValidationError = z.infer<typeof validationErrorSchema>;

export const apiErrorResponseSchema = z.object({
  success: z.literal(false),
  message: z.string(),
  code: z.string(),
  errors: z.array(validationErrorSchema).optional(),
});

export type ApiErrorResponse = z.infer<typeof apiErrorResponseSchema>;

export type ApiSuccessResponse<TData, TMeta = never> = {
  success: true;
  message: string;
  data: TData;
} & ([TMeta] extends [never] ? { meta?: undefined } : { meta: TMeta });

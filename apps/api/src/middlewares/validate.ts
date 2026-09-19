import type { NextFunction, Request, Response } from "express";
import { ErrorCode, type ApiErrorResponse } from "@repo/types";
import { z } from "zod";
import { toValidationErrors } from "@/lib/validation";

export const validate =
  <Schema extends z.ZodTypeAny>(schema: Schema) =>
  (
    req: Request<{}, {}, z.infer<Schema>>,
    res: Response<ApiErrorResponse>,
    next: NextFunction,
  ) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const errors = toValidationErrors(result.error);

      return res.status(400).json({
        success: false,
        message: "Invalid request data",
        code: ErrorCode.VALIDATION_FAILED,
        errors,
      });
    }

    req.body = result.data;
    next();
  };

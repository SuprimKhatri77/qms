import type { NextFunction, Request, Response } from "express";
import {
  ErrorCode,
  type ApiErrorResponse,
  type ValidationError,
} from "@repo/types";
import { z } from "zod";

export const validate =
  <Schema extends z.ZodTypeAny>(schema: Schema) =>
  (
    req: Request<{}, {}, z.infer<Schema>>,
    res: Response<ApiErrorResponse>,
    next: NextFunction,
  ) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const errors: ValidationError[] = result.error.issues.map((issue) => ({
        field: issue.path.join(".") || "root",
        message: issue.message,
        code: issue.code,
      }));

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

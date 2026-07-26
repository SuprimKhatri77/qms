import type { NextFunction, Request, Response } from "express";
import { z } from "zod";

export const validate =
  <Schema extends z.ZodTypeAny>(schema: Schema) =>
  (
    req: Request<{}, {}, z.infer<Schema>>,
    res: Response,
    next: NextFunction,
  ) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const fieldErrors: Record<string, string[]> = {};
      result.error.issues.forEach((issue) => {
        const fieldName = issue.path.join(".") || "root";
        if (!fieldErrors[fieldName]) {
          fieldErrors[fieldName] = [];
        }
        fieldErrors[fieldName]?.push(issue.message);
      });
      return res.status(400).json({ errors: fieldErrors });
    }
    req.body = result.data;
    next();
  };

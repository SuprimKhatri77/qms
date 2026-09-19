import { z } from "zod";
import { historyQuerySchema } from "@repo/types";
import { registry, SESSION_COOKIE_AUTH } from "../registry";
import {
  apiSuccessSchema,
  historyDayDetailSchema,
  historyDaySchema,
  paginationMetaSchema,
} from "../schemas";
import {
  badRequest,
  forbidden,
  notFound,
  serverError,
  unauthorized,
} from "../common-responses";

// Mounted at /api/v1/shops/me/history, behind the owner-only auth in
// routes/shops.ts.
const ownerSecurity = [{ [SESSION_COOKIE_AUTH]: [] }];

const dateParam = z.object({
  date: z.iso.date().openapi({ description: "YYYY-MM-DD, shop-local." }),
});

registry.registerPath({
  method: "get",
  path: "/api/v1/shops/me/history",
  tags: ["History"],
  summary: "List past days that had at least one ticket",
  security: ownerSecurity,
  request: { query: historyQuerySchema },
  responses: {
    200: {
      description: "A page of past days, newest first.",
      content: {
        "application/json": {
          schema: apiSuccessSchema(
            z.object({ days: z.array(historyDaySchema) }),
            paginationMetaSchema,
          ),
        },
      },
    },
    400: badRequest,
    401: unauthorized,
    403: forbidden,
    500: serverError,
  },
});

registry.registerPath({
  method: "get",
  path: "/api/v1/shops/me/history/{date}",
  tags: ["History"],
  summary: "Get every ticket from one past day",
  description:
    "Includes tickets that never got verified, unlike the live queue.",
  security: ownerSecurity,
  request: { params: dateParam },
  responses: {
    200: {
      description: "The day's queue and every ticket in it.",
      content: {
        "application/json": {
          schema: apiSuccessSchema(historyDayDetailSchema),
        },
      },
    },
    400: badRequest,
    401: unauthorized,
    403: forbidden,
    404: notFound,
    500: serverError,
  },
});

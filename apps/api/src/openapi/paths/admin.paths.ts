import { z } from "zod";
import {
  analyticsQuerySchema,
  systemLogsQuerySchema,
  updateShopStatusSchema,
} from "@repo/types";
import { registry, SESSION_COOKIE_AUTH } from "../registry";
import {
  adminShopSummarySchema,
  apiSuccessSchema,
  platformAnalyticsSchema,
  systemLogSchema,
} from "../schemas";
import {
  badRequest,
  forbidden,
  notFound,
  serverError,
  unauthorized,
} from "../common-responses";

// "admin" and "superadmin" get identical access for now — see routes/admin.ts.
const adminSecurity = [{ [SESSION_COOKIE_AUTH]: [] }];

const shopIdParam = z.object({ shopId: z.uuid() });

registry.registerPath({
  method: "get",
  path: "/api/v1/admin/shops",
  tags: ["Admin"],
  summary: "List every shop on the platform",
  description: "Newest first, with owner info and a lifetime ticket count.",
  security: adminSecurity,
  responses: {
    200: {
      description: "Every shop.",
      content: {
        "application/json": {
          schema: apiSuccessSchema(
            z.object({ shops: z.array(adminShopSummarySchema) }),
          ),
        },
      },
    },
    401: unauthorized,
    403: forbidden,
    500: serverError,
  },
});

registry.registerPath({
  method: "patch",
  path: "/api/v1/admin/shops/{shopId}/status",
  tags: ["Admin"],
  summary: "Suspend or reactivate a shop",
  description:
    "Suspending only blocks new customers from joining on the public link — it doesn't touch the shop's queue, existing tickets, or owner dashboard access.",
  security: adminSecurity,
  request: {
    params: shopIdParam,
    body: {
      content: { "application/json": { schema: updateShopStatusSchema } },
    },
  },
  responses: {
    200: {
      description: "Updated status.",
      content: {
        "application/json": {
          schema: apiSuccessSchema(
            z.object({
              shopId: z.uuid(),
              status: z.enum(["active", "suspended"]),
            }),
          ),
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

registry.registerPath({
  method: "get",
  path: "/api/v1/admin/analytics",
  tags: ["Admin"],
  summary: "Get platform-wide analytics",
  description:
    "Same shape as a shop's own analytics, plus totalShops/activeShops. Bucketed against a fixed reference timezone (Asia/Kathmandu), not each shop's own timezone.",
  security: adminSecurity,
  request: { query: analyticsQuerySchema },
  responses: {
    200: {
      description: "Platform-wide summary, daily and hourly breakdowns.",
      content: {
        "application/json": {
          schema: apiSuccessSchema(platformAnalyticsSchema),
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
  path: "/api/v1/admin/logs",
  tags: ["Admin"],
  summary: "List system log entries",
  description:
    "Things that went wrong (or are worth noting) outside a request a user was waiting on, e.g. a failed turn-alert email. Newest first.",
  security: adminSecurity,
  request: { query: systemLogsQuerySchema },
  responses: {
    200: {
      description: "A page of log entries.",
      content: {
        "application/json": {
          schema: apiSuccessSchema(
            z.object({ logs: z.array(systemLogSchema) }),
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

import { z } from "zod";
import {
  analyticsQuerySchema,
  createShopSchema,
  updateShopSchema,
} from "@repo/types";
import { registry, SESSION_COOKIE_AUTH } from "../registry";
import { analyticsSchema, apiSuccessSchema, shopSchema } from "../schemas";
import {
  badRequest,
  duplicateEntry,
  forbidden,
  notFound,
  serverError,
  unauthorized,
} from "../common-responses";

// Every route here is owner-only (requireRole("owner") in routes/shops.ts) —
// an admin/superadmin session gets 403, same as no session gets 401.
const ownerSecurity = [{ [SESSION_COOKIE_AUTH]: [] }];

const shopEnvelope = apiSuccessSchema(z.object({ shop: shopSchema }));

registry.registerPath({
  method: "post",
  path: "/api/v1/shops",
  tags: ["Shops"],
  summary: "Create the signed-in owner's shop",
  description:
    "Each owner has at most one shop. Calling this twice fails with DUPLICATE_ENTRY.",
  security: ownerSecurity,
  request: {
    body: { content: { "application/json": { schema: createShopSchema } } },
  },
  responses: {
    201: {
      description: "Shop created.",
      content: { "application/json": { schema: shopEnvelope } },
    },
    400: badRequest,
    401: unauthorized,
    403: forbidden,
    409: duplicateEntry,
    500: serverError,
  },
});

registry.registerPath({
  method: "get",
  path: "/api/v1/shops/me",
  tags: ["Shops"],
  summary: "Get the signed-in owner's shop",
  description: "`data.shop` is null until the owner finishes onboarding.",
  security: ownerSecurity,
  responses: {
    200: {
      description: "The owner's shop, or null.",
      content: {
        "application/json": {
          schema: apiSuccessSchema(z.object({ shop: shopSchema.nullable() })),
        },
      },
    },
    401: unauthorized,
    403: forbidden,
    500: serverError,
  },
});

registry.registerPath({
  method: "put",
  path: "/api/v1/shops/me",
  tags: ["Shops"],
  summary: "Replace the signed-in owner's shop settings",
  description:
    "A full replace, not a patch — send every field every time. The slug is never changed.",
  security: ownerSecurity,
  request: {
    body: { content: { "application/json": { schema: updateShopSchema } } },
  },
  responses: {
    200: {
      description: "Shop updated.",
      content: { "application/json": { schema: shopEnvelope } },
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
  path: "/api/v1/shops/me/analytics",
  tags: ["Shops"],
  summary: "Get the owner's shop analytics",
  security: ownerSecurity,
  request: { query: analyticsQuerySchema },
  responses: {
    200: {
      description: "Summary, daily and hourly breakdowns for the shop.",
      content: {
        "application/json": { schema: apiSuccessSchema(analyticsSchema) },
      },
    },
    400: badRequest,
    401: unauthorized,
    403: forbidden,
    404: notFound,
    500: serverError,
  },
});

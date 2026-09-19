import { z } from "zod";
import { registry, SESSION_COOKIE_AUTH } from "../registry";
import { apiSuccessSchema, queueSnapshotSchema } from "../schemas";
import {
  badRequest,
  conflict,
  forbidden,
  notFound,
  serverError,
  unauthorized,
} from "../common-responses";

// Mounted at /api/v1/shops/me/queue, behind the owner-only auth in
// routes/shops.ts.
const ownerSecurity = [{ [SESSION_COOKIE_AUTH]: [] }];

const ticketIdParam = z.object({
  ticketId: z.uuid().openapi({ description: "The ticket to resolve." }),
});

const snapshotEnvelope = apiSuccessSchema(queueSnapshotSchema);

registry.registerPath({
  method: "get",
  path: "/api/v1/shops/me/queue",
  tags: ["Queue"],
  summary: "Get today's queue snapshot",
  description:
    "Everything the dashboard needs to draw today's queue: who's serving, who's waiting, and today's done/no-show counts.",
  security: ownerSecurity,
  responses: {
    200: {
      description: "Today's queue snapshot.",
      content: { "application/json": { schema: snapshotEnvelope } },
    },
    401: unauthorized,
    403: forbidden,
    404: notFound,
    500: serverError,
  },
});

registry.registerPath({
  method: "post",
  path: "/api/v1/shops/me/queue/call-next",
  tags: ["Queue"],
  summary: "Call the next waiting customer",
  description:
    "Advances the queue's counter to the next waiting ticket. Fails with CONFLICT if someone is already being served, the queue is closed, or nobody is waiting. Fires turn-alert emails to customers now within range of being called.",
  security: ownerSecurity,
  responses: {
    200: {
      description: "Updated queue snapshot.",
      content: { "application/json": { schema: snapshotEnvelope } },
    },
    401: unauthorized,
    403: forbidden,
    404: notFound,
    409: conflict,
    500: serverError,
  },
});

registry.registerPath({
  method: "post",
  path: "/api/v1/shops/me/queue/tickets/{ticketId}/done",
  tags: ["Queue"],
  summary: "Mark the currently-serving ticket as done",
  security: ownerSecurity,
  request: { params: ticketIdParam },
  responses: {
    200: {
      description: "Updated queue snapshot.",
      content: { "application/json": { schema: snapshotEnvelope } },
    },
    400: badRequest,
    401: unauthorized,
    403: forbidden,
    404: notFound,
    500: serverError,
  },
});

registry.registerPath({
  method: "post",
  path: "/api/v1/shops/me/queue/tickets/{ticketId}/no-show",
  tags: ["Queue"],
  summary: "Mark the currently-serving ticket as a no-show",
  security: ownerSecurity,
  request: { params: ticketIdParam },
  responses: {
    200: {
      description: "Updated queue snapshot.",
      content: { "application/json": { schema: snapshotEnvelope } },
    },
    400: badRequest,
    401: unauthorized,
    403: forbidden,
    404: notFound,
    500: serverError,
  },
});

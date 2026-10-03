import { z } from "zod";
import { updateQueueStatusSchema } from "@repo/types";
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
  ticketId: z
    .uuid()
    .openapi({ description: "The ticket to resolve or remove." }),
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
  method: "put",
  path: "/api/v1/shops/me/queue/status",
  tags: ["Queue"],
  summary: "Open or close today's queue",
  description:
    '"closed" stops new customers joining (join returns CONFLICT). Customers already in line can still be called and served. "active" reopens it, except while it is past the shop\'s closing time: that returns CONFLICT (the owner changes the closing time first). Otherwise, setting the current status again is a no-op. The server also closes the queue on its own at the shop\'s closing time or the end of the shop-local day (a sweep every 5 minutes), expiring anyone still pending or waiting; a reopened queue is closed again the same way.',
  security: ownerSecurity,
  request: {
    body: {
      content: { "application/json": { schema: updateQueueStatusSchema } },
    },
  },
  responses: {
    200: {
      description: "Updated queue snapshot.",
      content: { "application/json": { schema: snapshotEnvelope } },
    },
    400: badRequest,
    401: unauthorized,
    403: forbidden,
    404: notFound,
    409: conflict,
    500: serverError,
  },
});

registry.registerPath({
  method: "post",
  path: "/api/v1/shops/me/queue/call-next",
  tags: ["Queue"],
  summary: "Call the next waiting customer",
  description:
    "Sets the queue's counter to the lowest waiting token (the same order customers' positions are counted in), so a customer who confirmed their email late still gets their place. Fails with CONFLICT if someone is already being served or nobody is waiting. Still works while the queue is closed: closing only stops new joins. Fires turn-alert emails to customers now within range of being called.",
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

registry.registerPath({
  method: "post",
  path: "/api/v1/shops/me/queue/tickets/{ticketId}/remove",
  tags: ["Queue"],
  summary: "Remove a waiting customer from the queue",
  description:
    "For a customer who tells staff they're leaving. Only a waiting ticket can be removed: the customer being served is finished with done/no-show instead, and any other ticket (unconfirmed, finished, another shop's, unknown) returns NOT_FOUND. The ticket is recorded as cancelled, the same as a customer leaving from their own page, so the customer's ticket page shows it as cancelled. No other ticket is changed: everyone behind moves up one place because positions are derived on read, and call-next skips the removed token.",
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

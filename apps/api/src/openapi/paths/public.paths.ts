import { z } from "zod";
import { joinQueueSchema, verifyTicketSchema } from "@repo/types";
import { registry } from "../registry";
import { apiSuccessSchema, publicTicketSchema, shopSchema } from "../schemas";
import {
  badRequest,
  conflict,
  notFound,
  serverError,
} from "../common-responses";

// Everything here is reachable with no session: customers never have
// accounts.
const slugParam = z.object({ slug: z.string() });
const ticketIdParam = z.object({ ticketId: z.uuid() });

registry.registerPath({
  method: "get",
  path: "/api/v1/public/shops/{slug}",
  tags: ["Public"],
  summary: "Get a shop's public info by slug",
  description:
    "Powers the join page reached from a shop's QR code, e.g. /s/{slug}.",
  request: { params: slugParam },
  responses: {
    200: {
      description: "The shop.",
      content: {
        "application/json": {
          schema: apiSuccessSchema(z.object({ shop: shopSchema })),
        },
      },
    },
    404: notFound,
    500: serverError,
  },
});

registry.registerPath({
  method: "post",
  path: "/api/v1/public/shops/{slug}/tickets",
  tags: ["Public"],
  summary: "Join a shop's queue",
  description:
    "Creates a pending ticket and emails a verification link. Fails with CONFLICT if the shop is suspended or today's queue is closed, and DUPLICATE_ENTRY if this email already has an active ticket today.",
  request: {
    params: slugParam,
    body: { content: { "application/json": { schema: joinQueueSchema } } },
  },
  responses: {
    200: {
      description: "Ticket created; verification email sent.",
      content: {
        "application/json": {
          schema: apiSuccessSchema(z.object({ ticketId: z.uuid() })),
        },
      },
    },
    400: badRequest,
    404: notFound,
    409: conflict,
    500: serverError,
  },
});

registry.registerPath({
  method: "post",
  path: "/api/v1/public/tickets/verify",
  tags: ["Public"],
  summary: "Verify a ticket from its emailed token",
  description: "Moves a ticket from pending_verification to waiting.",
  request: {
    body: { content: { "application/json": { schema: verifyTicketSchema } } },
  },
  responses: {
    200: {
      description: "The now-verified ticket.",
      content: {
        "application/json": {
          schema: apiSuccessSchema(z.object({ ticket: publicTicketSchema })),
        },
      },
    },
    400: badRequest,
    404: notFound,
    409: conflict,
    500: serverError,
  },
});

registry.registerPath({
  method: "get",
  path: "/api/v1/public/tickets/{ticketId}",
  tags: ["Public"],
  summary: "Get a customer's own ticket",
  description:
    "Powers the live-status page a verified customer's link points to. Reached by a hard-to-guess ticket id, not a session.",
  request: { params: ticketIdParam },
  responses: {
    200: {
      description: "The ticket and its shop's name/slug.",
      content: {
        "application/json": {
          schema: apiSuccessSchema(
            z.object({
              ticket: publicTicketSchema,
              shop: z.object({ name: z.string(), slug: z.string() }),
            }),
          ),
        },
      },
    },
    400: badRequest,
    404: notFound,
    500: serverError,
  },
});

import { z } from "zod";
import {
  discoverShopsQuerySchema,
  joinQueueSchema,
  verifyTicketSchema,
} from "@repo/types";
import { registry } from "../registry";
import {
  apiSuccessSchema,
  discoveredShopSchema,
  hoursStatusSchema,
  publicTicketSchema,
  shopSchema,
} from "../schemas";
import {
  badRequest,
  conflict,
  notFound,
  serverError,
  tooManyRequests,
} from "../common-responses";

// Everything here is reachable with no session: customers never have
// accounts.
const slugParam = z.object({ slug: z.string() });
const ticketIdParam = z.object({ ticketId: z.uuid() });

registry.registerPath({
  method: "get",
  path: "/api/v1/public/shops",
  tags: ["Public"],
  summary: "Find shops (discovery)",
  description:
    'Powers the public /explore page. Filter by city (case-insensitive) and category, or send lat+lng for "near me": a bounding-box prefilter, then the exact Haversine distance within radiusKm, nearest first. Suspended shops never appear. Today\'s queue is only read, never created. At most 50 results.',
  request: { query: discoverShopsQuerySchema },
  responses: {
    200: {
      description: "Matching shops, and every city with an active shop.",
      content: {
        "application/json": {
          schema: apiSuccessSchema(
            z.object({
              shops: z.array(discoveredShopSchema),
              cities: z.array(z.string()),
            }),
          ),
        },
      },
    },
    400: badRequest,
    500: serverError,
  },
});

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
      description:
        "The shop, whether the owner has today's queue open, and whether it's within the shop's opening hours. Customers can join only when both allow it.",
      content: {
        "application/json": {
          schema: apiSuccessSchema(
            z.object({
              shop: shopSchema,
              queueOpen: z.boolean(),
              hoursStatus: hoursStatusSchema,
            }),
          ),
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
    "Creates a pending ticket and emails a verification link. Fails with CONFLICT if the shop is suspended, it's before the shop's opening time or past its closing time, today's queue is closed, or this device already holds 2 active tickets in this queue, and DUPLICATE_ENTRY if this email already has an active ticket today. An unconfirmed ticket whose link has run out doesn't count as active: it's marked expired first, so the customer can join again. The device is identified by the queueup_device cookie (HttpOnly, SameSite=Lax, Secure in production, Path=/api/v1/public, one day). Every response from this endpoint that gets past validation and rate limiting sets it with Set-Cookie, minting a new one if the request had none, so a first visit is never capped. It's a soft signal only: clearing cookies, or any client that doesn't send cookies back, is never capped. Device tokens are wiped from tickets once their queue is finished.",
  request: {
    params: slugParam,
    body: { content: { "application/json": { schema: joinQueueSchema } } },
  },
  responses: {
    200: {
      description: "Ticket created; verification email sent.",
      headers: {
        "Set-Cookie": {
          description:
            "queueup_device=<32 hex chars>, the device token, set or refreshed for one day. Refusals (404, 409, 500) set it too; validation (400) and rate-limit (429) responses don't, since they stop before the join runs.",
          schema: { type: "string" as const },
        },
      },
      content: {
        "application/json": {
          schema: apiSuccessSchema(z.object({ ticketId: z.uuid() })),
        },
      },
    },
    400: badRequest,
    404: notFound,
    409: conflict,
    429: tooManyRequests,
    500: serverError,
  },
});

registry.registerPath({
  method: "post",
  path: "/api/v1/public/tickets/verify",
  tags: ["Public"],
  summary: "Verify a ticket from its emailed token",
  description:
    "Moves a ticket from pending_verification to waiting. An expired link fails with CONFLICT and marks the ticket expired, so the customer can join again. A link that was already used (a second click, or an email scanner opening it first) isn't an error: it returns the ticket as it is now.",
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
    429: tooManyRequests,
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

registry.registerPath({
  method: "post",
  path: "/api/v1/public/tickets/{ticketId}/cancel",
  tags: ["Public"],
  summary: "Leave the queue",
  description:
    "The customer cancels their own ticket from its status page. Only works while the ticket is pending_verification or waiting; CONFLICT once it's being served or finished. Like viewing the ticket, the hard-to-guess ticket id is the access control. Nobody else's position changes: call-next just skips the cancelled token.",
  request: { params: ticketIdParam },
  responses: {
    200: {
      description: "The ticket, now cancelled, and its shop's name/slug.",
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
    409: conflict,
    429: tooManyRequests,
    500: serverError,
  },
});

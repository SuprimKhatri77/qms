import { z } from "zod";
import type { ApiSuccessResponse } from "../base";
import type { TicketStatus } from "../queue/queue";

export const joinQueueSchema = z.object({
  name: z
    .string({ error: "Name is required" })
    .trim()
    .min(2, { error: "Name must be at least 2 characters" })
    .max(60, { error: "Name must be at most 60 characters" }),
  email: z
    .string({ error: "Email is required" })
    .trim()
    .toLowerCase()
    .pipe(z.email({ error: "Enter a valid email address" })),
  // Optional: shown to the owner alongside the customer's name, not used to
  // contact them (only email carries the verification/turn-alert links).
  phone: z
    .string()
    .trim()
    .max(20, { error: "Phone number must be at most 20 characters" })
    .transform((value) => (value === "" ? undefined : value))
    .optional(),
});

export type JoinQueueRequest = z.infer<typeof joinQueueSchema>;

export type JoinQueueResponse = ApiSuccessResponse<{ ticketId: string }>;

export const verifyTicketSchema = z.object({
  token: z.string({ error: "Token is required" }).min(1),
});

export type VerifyTicketRequest = z.infer<typeof verifyTicketSchema>;

// What a customer sees of their own ticket. No email/phone: the page is
// reached by a hard-to-guess ticket id, but there's no reason to echo them
// back, and it keeps this shape safe to log or show on screen.
export type PublicTicket = {
  id: string;
  tokenNumber: number;
  customerName: string;
  status: TicketStatus;
  // Turns until it's this ticket's turn: 0 once serving, 1 = next, 2 = two
  // away, and so on. Always derived fresh from the queue's counter, never
  // stored — null once the ticket has reached a resolved/terminal state.
  position: number | null;
  etaMinutes: number | null;
  createdAt: string;
};

export type PublicTicketResponse = ApiSuccessResponse<{
  ticket: PublicTicket;
  shop: { name: string; slug: string };
}>;

export type VerifyTicketResponse = ApiSuccessResponse<{ ticket: PublicTicket }>;

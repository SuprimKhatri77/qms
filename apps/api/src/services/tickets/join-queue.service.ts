import { randomBytes } from "node:crypto";
import { and, eq, inArray, max } from "drizzle-orm";
import { db } from "@/db";
import { queues, ticketVerifications, tickets } from "@/db/schema";
import type {
  ApiErrorResponse,
  JoinQueueRequest,
  JoinQueueResponse,
} from "@repo/types";
import { ErrorCode } from "@repo/types";
import { getShopBySlug } from "@/services/shops/get-shop-by-slug";
import { findOrCreateTodaysQueue } from "@/services/queue/find-or-create-queue";
import { sendMail } from "@/lib/emails/send-email";

// A verification link is only good for this long. Matches the window Better
// Auth already uses for its own email links (resetPasswordTokenExpiresIn).
const VERIFICATION_TTL_MS = 15 * 60 * 1000;

// Statuses that count as "already in line" for the one-active-ticket-per-email
// rule. Mirrors the partial unique index on the tickets table, which is the
// real backstop against a race; this is just the friendly check that runs first.
const ACTIVE_STATUSES = ["pending_verification", "waiting", "serving"] as const;

export async function joinQueue(
  slug: string,
  data: JoinQueueRequest,
): Promise<JoinQueueResponse | ApiErrorResponse> {
  try {
    const shop = await getShopBySlug(slug);

    if (!shop) {
      return {
        success: false,
        message: "Shop not found",
        code: ErrorCode.NOT_FOUND,
      };
    }

    const todaysQueue = await findOrCreateTodaysQueue(shop);

    const outcome = await db.transaction(async (tx) => {
      // Lock the queue row: two customers joining at the same instant must
      // get consecutive token numbers, not the same one.
      const [queue] = await tx
        .select()
        .from(queues)
        .where(eq(queues.id, todaysQueue.id))
        .for("update");

      if (!queue || queue.status !== "active") {
        return {
          success: false as const,
          message: "This queue isn't accepting customers right now",
          code: ErrorCode.CONFLICT,
        };
      }

      const [existing] = await tx
        .select({ id: tickets.id })
        .from(tickets)
        .where(
          and(
            eq(tickets.queueId, queue.id),
            eq(tickets.customerEmail, data.email),
            inArray(tickets.status, ACTIVE_STATUSES),
          ),
        )
        .limit(1);

      if (existing) {
        return {
          success: false as const,
          message: "You already have an active ticket for this queue",
          code: ErrorCode.DUPLICATE_ENTRY,
        };
      }

      const [row] = await tx
        .select({ highest: max(tickets.tokenNumber) })
        .from(tickets)
        .where(eq(tickets.queueId, queue.id));
      const tokenNumber = (row?.highest ?? 0) + 1;

      const [ticket] = await tx
        .insert(tickets)
        .values({
          queueId: queue.id,
          tokenNumber,
          customerName: data.name,
          customerEmail: data.email,
          customerPhone: data.phone ?? null,
        })
        .returning();

      if (!ticket) {
        throw new Error("Ticket insert returned no row");
      }

      const token = randomBytes(32).toString("hex");

      await tx.insert(ticketVerifications).values({
        ticketId: ticket.id,
        token,
        expiresAt: new Date(Date.now() + VERIFICATION_TTL_MS),
      });

      return { success: true as const, ticketId: ticket.id, token };
    });

    if (!outcome.success) {
      return outcome;
    }

    // Fire-and-forget: the ticket already exists, and a real SMTP round trip
    // is too slow to make the customer wait on before they see their ticket.
    // Best-effort either way — if this fails, the customer can ask the shop,
    // or the owner can call them by name from the counter screen.
    const verifyUrl = `${process.env.FRONTEND_URL}/s/${slug}/verify?token=${outcome.token}`;
    sendMail({
      to: data.email,
      subject: `Confirm your spot at ${shop.name}`,
      text: `Confirm your spot in line: ${verifyUrl}\n\nThis link expires in 15 minutes.`,
      html: `<p>Confirm your spot in line at <strong>${shop.name}</strong>:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p><p>This link expires in 15 minutes.</p>`,
    }).catch((error) => {
      console.error("joinQueue: failed to send verification email:", error);
    });

    return {
      success: true,
      message: "Check your email to confirm your spot",
      data: { ticketId: outcome.ticketId },
    };
  } catch (error) {
    console.error("joinQueue failed:", error);
    return {
      success: false,
      message: "Failed to join the queue",
      code: ErrorCode.INTERNAL_SERVER_ERROR,
    };
  }
}

import { randomBytes } from "node:crypto";
import { and, count, eq, gt, inArray, max, notExists, or } from "drizzle-orm";
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
import { isPastClosingTime } from "@/services/queue/local-date";
import { sendMail } from "@/lib/emails/send-email";
import { logEvent } from "@/lib/system-logs/log-event";

// A verification link is only good for this long. Matches the window Better
// Auth already uses for its own email links (resetPasswordTokenExpiresIn).
const VERIFICATION_TTL_MS = 15 * 60 * 1000;

// Statuses that count as "already in line", for both the one-active-ticket-
// per-email rule and the per-device cap below. For the email rule this mirrors
// the partial unique index on the tickets table, which is the real backstop
// against a race; the check here is just the friendly one that runs first.
const ACTIVE_STATUSES = ["pending_verification", "waiting", "serving"] as const;

// How many places one browser (its palo_device cookie) may hold in the same
// queue at once. 2, not 1, so someone can also join for a companion without
// needing a second phone. A soft limit only: clearing cookies resets it, so
// email verification and the rate limits remain the real defenses.
const MAX_ACTIVE_TICKETS_PER_DEVICE = 2;

export async function joinQueue(
  slug: string,
  data: JoinQueueRequest,
  // The browser's palo_device cookie. The controller mints a fresh one for a
  // first visit (or blocked cookies), which has no tickets yet and so is
  // never capped: that's what makes this soft. The controller always passes
  // a token; null skips the device check, which the tests use to exercise
  // the email rules on their own.
  deviceToken: string | null,
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

    // Set by an admin, never by the owner. Checked before the queue is even
    // looked up, so a suspended shop's link can never create a ticket.
    if (shop.status === "suspended") {
      return {
        success: false,
        message: "This shop isn't accepting customers right now",
        code: ErrorCode.CONFLICT,
      };
    }

    // Past the shop's closing time nobody new can join, from that exact
    // minute. The expiry sweep closes the queue itself a few minutes later;
    // this check means no one slips in during that gap.
    if (isPastClosingTime(shop.closingTime, shop.timezone)) {
      return {
        success: false,
        message: "This queue isn't accepting customers right now",
        code: ErrorCode.CONFLICT,
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

      // A ticket whose confirmation link has run out can never become
      // "waiting", but it would still count as this email's one active
      // ticket and block every rejoin for the rest of the day. Retire it as
      // "expired" first, so "join the queue again" actually works.
      //
      // The same goes for the device cap below: a dead ticket this device
      // made under another email (a typo, say) shouldn't keep using up one
      // of its places, so this device's dead tickets are retired too.
      const belongsToThisCustomer = deviceToken
        ? or(
            eq(tickets.customerEmail, data.email),
            eq(tickets.deviceToken, deviceToken),
          )
        : eq(tickets.customerEmail, data.email);

      const now = new Date();
      await tx
        .update(tickets)
        .set({ status: "expired", resolvedAt: now })
        .where(
          and(
            eq(tickets.queueId, queue.id),
            belongsToThisCustomer,
            eq(tickets.status, "pending_verification"),
            notExists(
              tx
                .select({ id: ticketVerifications.id })
                .from(ticketVerifications)
                .where(
                  and(
                    eq(ticketVerifications.ticketId, tickets.id),
                    gt(ticketVerifications.expiresAt, now),
                  ),
                ),
            ),
          ),
        );

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

      // Runs under the queue row lock taken above, so two joins sent from
      // one device at the same instant are counted one after the other and
      // can't both slip in under the cap.
      if (deviceToken) {
        const [deviceTickets] = await tx
          .select({ total: count() })
          .from(tickets)
          .where(
            and(
              eq(tickets.queueId, queue.id),
              eq(tickets.deviceToken, deviceToken),
              inArray(tickets.status, ACTIVE_STATUSES),
            ),
          );

        if ((deviceTickets?.total ?? 0) >= MAX_ACTIVE_TICKETS_PER_DEVICE) {
          return {
            success: false as const,
            message: `This device already holds ${MAX_ACTIVE_TICKETS_PER_DEVICE} places in this queue. Leave one from its ticket page to free a place.`,
            code: ErrorCode.CONFLICT,
          };
        }
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
          deviceToken,
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
      logEvent(
        "error",
        "join-queue-email",
        "Failed to send verification email",
        {
          shopId: shop.id,
          ticketId: outcome.ticketId,
          email: data.email,
          error: String(error),
        },
      );
    });

    return {
      success: true,
      message: "Check your email to confirm your spot",
      data: { ticketId: outcome.ticketId },
    };
  } catch (error) {
    console.error("joinQueue failed:", error);
    logEvent("error", "join-queue", "joinQueue threw an unexpected error", {
      slug,
      email: data.email,
      error: String(error),
    });
    return {
      success: false,
      message: "Failed to join the queue",
      code: ErrorCode.INTERNAL_SERVER_ERROR,
    };
  }
}

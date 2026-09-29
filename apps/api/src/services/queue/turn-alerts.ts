import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { tickets } from "@/db/schema";
import { sendTurnAlertEmail } from "@/services/tickets/send-turn-alert-email";

// A ticket gets one "you're almost up" email once it's this close to the
// front: among the first TURN_ALERT_THRESHOLD customers still waiting.
// `turnAlertSentAt` is the guard against sending it twice as the line moves.
const TURN_ALERT_THRESHOLD = 2;

export type TurnAlert = {
  id: string;
  customerName: string;
  customerEmail: string;
  position: number;
};

// The `tx` a db.transaction(async (tx) => ...) callback receives.
type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Finds the customers who have just reached the front of the line and
 * haven't been emailed yet, and marks them as emailed.
 *
 * Called whenever the line moves up: call-next, and a waiting customer
 * leaving or being removed. It runs inside the caller's transaction, which
 * already holds the queue's row lock, so two moves at once can't both claim
 * (and double-send) the same alert. Only the first TURN_ALERT_THRESHOLD
 * waiting tickets are read, however long the queue is.
 *
 * Their position is simply their place in this short list (1 = next),
 * counting only real waiting customers, so it matches their ticket page.
 */
export async function claimTurnAlerts(
  tx: Transaction,
  queueId: string,
): Promise<TurnAlert[]> {
  const frontOfLine = await tx
    .select({
      id: tickets.id,
      customerName: tickets.customerName,
      customerEmail: tickets.customerEmail,
      turnAlertSentAt: tickets.turnAlertSentAt,
    })
    .from(tickets)
    .where(and(eq(tickets.queueId, queueId), eq(tickets.status, "waiting")))
    .orderBy(asc(tickets.tokenNumber))
    .limit(TURN_ALERT_THRESHOLD);

  const alerts: TurnAlert[] = [];
  frontOfLine.forEach((ticket, index) => {
    if (ticket.turnAlertSentAt === null) {
      alerts.push({
        id: ticket.id,
        customerName: ticket.customerName,
        customerEmail: ticket.customerEmail,
        position: index + 1,
      });
    }
  });

  if (alerts.length > 0) {
    await tx
      .update(tickets)
      .set({ turnAlertSentAt: new Date() })
      .where(
        inArray(
          tickets.id,
          alerts.map((ticket) => ticket.id),
        ),
      );
  }

  return alerts;
}

/**
 * Sends the emails claimed by claimTurnAlerts. Call it only after the
 * transaction has committed, so nobody is emailed about a move that was
 * rolled back. Fire-and-forget, like the other queue emails: the ticket's
 * state is already correct whether or not the email lands.
 */
export function sendTurnAlerts(
  alerts: TurnAlert[],
  shop: { name: string; slug: string },
) {
  for (const alert of alerts) {
    sendTurnAlertEmail(
      alert,
      shop.name,
      alert.position,
      `${process.env.FRONTEND_URL}/s/${shop.slug}/ticket/${alert.id}`,
    );
  }
}

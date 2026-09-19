import { sendMail } from "@/lib/emails/send-email";
import { logEvent } from "@/lib/system-logs/log-event";

type TurnAlertRecipient = {
  customerName: string;
  customerEmail: string;
};

// Fire-and-forget, same trade-off as the join confirmation email in
// join-queue.service.ts: the ticket's position is already correct in the
// database regardless of whether this email lands, so nothing awaits it.
export function sendTurnAlertEmail(
  recipient: TurnAlertRecipient,
  shopName: string,
  position: number,
  ticketUrl: string,
) {
  const howFar = position === 1 ? "next" : `${position} away`;
  const subject =
    position === 1
      ? `You're next at ${shopName}`
      : `You're almost up at ${shopName}`;

  sendMail({
    to: recipient.customerEmail,
    subject,
    text: `Hi ${recipient.customerName}, you're ${howFar} in line at ${shopName}. Track your spot: ${ticketUrl}`,
    html: `<p>Hi ${recipient.customerName}, you're <strong>${howFar}</strong> in line at ${shopName}.</p><p><a href="${ticketUrl}">${ticketUrl}</a></p>`,
  }).catch((error) => {
    console.error("sendTurnAlertEmail failed:", error);
    logEvent("error", "turn-alert-email", "Failed to send turn-alert email", {
      customerEmail: recipient.customerEmail,
      error: String(error),
    });
  });
}

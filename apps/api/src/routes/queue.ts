import { Router } from "express";
import { updateQueueStatusSchema } from "@repo/types";
import { validate } from "@/middlewares/validate";
import { getShopQueueController } from "@/controllers/queue/get-shop-queue.controller";
import { callNextController } from "@/controllers/queue/call-next.controller";
import { resolveTicketController } from "@/controllers/queue/resolve-ticket.controller";
import { removeTicketController } from "@/controllers/queue/remove-ticket.controller";
import { setQueueStatusController } from "@/controllers/queue/set-queue-status.controller";

// Mounted at /shops/me/queue, behind the owner-only auth in routes/shops.ts.
const queueRoutes = Router();

queueRoutes.get("/", getShopQueueController);
queueRoutes.put(
  "/status",
  validate(updateQueueStatusSchema),
  setQueueStatusController,
);
queueRoutes.post("/call-next", callNextController);
queueRoutes.post("/tickets/:ticketId/done", resolveTicketController("done"));
queueRoutes.post(
  "/tickets/:ticketId/no-show",
  resolveTicketController("no_show"),
);
queueRoutes.post("/tickets/:ticketId/remove", removeTicketController);

export { queueRoutes };

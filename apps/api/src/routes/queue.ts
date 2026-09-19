import { Router } from "express";
import { getShopQueueController } from "@/controllers/queue/get-shop-queue.controller";
import { callNextController } from "@/controllers/queue/call-next.controller";
import { resolveTicketController } from "@/controllers/queue/resolve-ticket.controller";

// Mounted at /shops/me/queue, behind the owner-only auth in routes/shops.ts.
const queueRoutes = Router();

queueRoutes.get("/", getShopQueueController);
queueRoutes.post("/call-next", callNextController);
queueRoutes.post("/tickets/:ticketId/done", resolveTicketController("done"));
queueRoutes.post(
  "/tickets/:ticketId/no-show",
  resolveTicketController("no_show"),
);

export { queueRoutes };

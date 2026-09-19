import { Router } from "express";
import { joinQueueSchema, verifyTicketSchema } from "@repo/types";
import { validate } from "@/middlewares/validate";
import { getPublicShopController } from "@/controllers/tickets/get-public-shop.controller";
import { joinQueueController } from "@/controllers/tickets/join-queue.controller";
import { verifyTicketController } from "@/controllers/tickets/verify-ticket.controller";
import { getPublicTicketController } from "@/controllers/tickets/get-public-ticket.controller";

// Everything here is reachable with no session: customers never have
// accounts. Kept in its own router (not nested under /shops, which is
// owner-only from its very first middleware) so there's no chance of this
// ever inheriting an auth gate by accident.
const publicRoutes = Router();

publicRoutes.get("/shops/:slug", getPublicShopController);
publicRoutes.post(
  "/shops/:slug/tickets",
  validate(joinQueueSchema),
  joinQueueController,
);
publicRoutes.post(
  "/tickets/verify",
  validate(verifyTicketSchema),
  verifyTicketController,
);
publicRoutes.get("/tickets/:ticketId", getPublicTicketController);

export { publicRoutes };

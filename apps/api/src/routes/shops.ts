import { Router } from "express";
import { createShopSchema, updateShopSchema } from "@repo/types";
import { requireAuth, requireRole } from "@/middlewares/require-auth";
import { validate } from "@/middlewares/validate";
import { createShopController } from "@/controllers/shops/create-shop.controller";
import { getMyShopController } from "@/controllers/shops/get-my-shop.controller";
import { updateShopController } from "@/controllers/shops/update-shop.controller";
import { getAnalyticsController } from "@/controllers/analytics/get-analytics.controller";
import { queueRoutes } from "./queue";
import { historyRoutes } from "./history";

const shopRoutes = Router();

// Only shop owners manage shops. Admins are rejected with 403.
shopRoutes.use(requireAuth, requireRole("owner"));

shopRoutes.post("/", validate(createShopSchema), createShopController);
shopRoutes.get("/me", getMyShopController);
shopRoutes.put("/me", validate(updateShopSchema), updateShopController);
shopRoutes.get("/me/analytics", getAnalyticsController);
shopRoutes.use("/me/queue", queueRoutes);
shopRoutes.use("/me/history", historyRoutes);

export { shopRoutes };

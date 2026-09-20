import { Router } from "express";
import { updateShopStatusSchema } from "@repo/types";
import { requireAuth, requireRole } from "@/middlewares/require-auth";
import { validate } from "@/middlewares/validate";
import { listShopsController } from "@/controllers/admin/list-shops.controller";
import { updateShopStatusController } from "@/controllers/admin/update-shop-status.controller";
import { getPlatformAnalyticsController } from "@/controllers/admin/get-platform-analytics.controller";
import { listSystemLogsController } from "@/controllers/admin/list-system-logs.controller";

const adminRoutes = Router();

// "admin" and "superadmin" get identical access for now — there's no second
// admin tier to differentiate them against yet.
adminRoutes.use(requireAuth, requireRole("admin", "superadmin"));

adminRoutes.get("/shops", listShopsController);
adminRoutes.patch(
  "/shops/:shopId/status",
  validate(updateShopStatusSchema),
  updateShopStatusController,
);
adminRoutes.get("/analytics", getPlatformAnalyticsController);
adminRoutes.get("/logs", listSystemLogsController);

export { adminRoutes };

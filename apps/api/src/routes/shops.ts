import { Router } from "express";
import { createShopSchema } from "@repo/types";
import { requireAuth, requireRole } from "@/middlewares/require-auth";
import { validate } from "@/middlewares/validate";
import { createShopController } from "@/controllers/shops/create-shop.controller";
import { getMyShopController } from "@/controllers/shops/get-my-shop.controller";
import { queueRoutes } from "./queue";

const shopRoutes = Router();

// Only shop owners manage shops. Admins are rejected with 403.
shopRoutes.use(requireAuth, requireRole("owner"));

shopRoutes.post("/", validate(createShopSchema), createShopController);
shopRoutes.get("/me", getMyShopController);
shopRoutes.use("/me/queue", queueRoutes);

export { shopRoutes };

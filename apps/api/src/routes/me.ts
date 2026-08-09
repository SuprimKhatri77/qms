import { Router } from "express";
import { requireAuth } from "@/middlewares/require-auth";
import { meController } from "@/controllers/auth/me.controller";

const meRoutes = Router();

meRoutes.get("/", requireAuth, meController);

export { meRoutes };

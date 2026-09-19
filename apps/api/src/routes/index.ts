import { Router } from "express";
import { authRoutes } from "./auth";
import { meRoutes } from "./me";
import { shopRoutes } from "./shops";

const routes = Router();

routes.use("/auth", authRoutes);
routes.use("/auth/me", meRoutes);
routes.use("/shops", shopRoutes);

export { routes };

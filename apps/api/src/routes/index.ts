import { Router } from "express";
import { authRoutes } from "./auth";
import { meRoutes } from "./me";
import { shopRoutes } from "./shops";
import { publicRoutes } from "./public";

const routes = Router();

routes.use("/auth", authRoutes);
routes.use("/auth/me", meRoutes);
routes.use("/shops", shopRoutes);
routes.use("/public", publicRoutes);

export { routes };

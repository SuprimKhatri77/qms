import { Router } from "express";
import { authRoutes } from "./auth";
import { meRoutes } from "./me";

const routes = Router();

routes.use("/auth", authRoutes);
routes.use("/auth/me", meRoutes);

export { routes };

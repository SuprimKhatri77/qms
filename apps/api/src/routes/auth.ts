import { Router } from "express";
import { loginSchema, signupSchema } from "@repo/types";
import { validate } from "@/middlewares/validate";
import { loginController } from "@/controllers/auth/login.controller";
import { signupController } from "@/controllers/auth/signup.controller";
import { logoutController } from "@/controllers/auth/logout.controller";

const authRoutes = Router();

authRoutes.post("/login", validate(loginSchema), loginController);
authRoutes.post("/signup", validate(signupSchema), signupController);
authRoutes.post("/logout", logoutController);

export { authRoutes };

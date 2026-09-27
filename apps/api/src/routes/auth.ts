import { Router } from "express";
import { loginSchema, signupSchema } from "@repo/types";
import { validate } from "@/middlewares/validate";
import { rateLimit } from "@/middlewares/rate-limit";
import { loginRules, signupRules } from "@/lib/rate-limit/rules";
import { loginController } from "@/controllers/auth/login.controller";
import { signupController } from "@/controllers/auth/signup.controller";
import { logoutController } from "@/controllers/auth/logout.controller";

const authRoutes = Router();

// Rate limiting runs after validation, so malformed requests are rejected
// without touching Redis, and the rules read an already-validated email.
authRoutes.post(
  "/login",
  validate(loginSchema),
  rateLimit(loginRules),
  loginController,
);
authRoutes.post(
  "/signup",
  validate(signupSchema),
  rateLimit(signupRules),
  signupController,
);
authRoutes.post("/logout", logoutController);

export { authRoutes };

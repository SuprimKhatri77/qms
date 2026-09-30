import { Router } from "express";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  signupSchema,
} from "@repo/types";
import { validate } from "@/middlewares/validate";
import { rateLimit } from "@/middlewares/rate-limit";
import { requireAuth } from "@/middlewares/require-auth";
import {
  authEmailRules,
  changePasswordRules,
  loginRules,
  resetPasswordRules,
  signupRules,
} from "@/lib/rate-limit/rules";
import { loginController } from "@/controllers/auth/login.controller";
import { signupController } from "@/controllers/auth/signup.controller";
import { logoutController } from "@/controllers/auth/logout.controller";
import { forgotPasswordController } from "@/controllers/auth/forgot-password.controller";
import { resetPasswordController } from "@/controllers/auth/reset-password.controller";
import { changePasswordController } from "@/controllers/auth/change-password.controller";

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
// Shares its counters with Better Auth's own /api/auth/request-password-reset
// (same rule names, see app.ts), so switching between the two doesn't get
// anyone a fresh allowance of reset emails.
authRoutes.post(
  "/forgot-password",
  validate(forgotPasswordSchema),
  rateLimit(authEmailRules),
  forgotPasswordController,
);
authRoutes.post(
  "/reset-password",
  validate(resetPasswordSchema),
  rateLimit(resetPasswordRules),
  resetPasswordController,
);
// requireAuth comes first here: the limit is counted per signed-in account
// (see changePasswordRules), and a request with no session is turned away
// before it's counted at all.
authRoutes.post(
  "/change-password",
  requireAuth,
  validate(changePasswordSchema),
  rateLimit(changePasswordRules),
  changePasswordController,
);

export { authRoutes };

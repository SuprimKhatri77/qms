import { z } from "zod";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  signupSchema,
  userSchema,
} from "@repo/types";
import { registry, SESSION_COOKIE_AUTH } from "../registry";
import { apiSuccessSchema } from "../schemas";
import {
  badRequest,
  conflict,
  errorResponse,
  duplicateEntry,
  serverError,
  tooManyRequests,
  unauthorized,
} from "../common-responses";

const userEnvelope = apiSuccessSchema(z.object({ user: userSchema }));

// Logout, forgot-password, reset-password and change-password answer with
// just a message.
const messageResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
});

registry.registerPath({
  method: "post",
  path: "/api/v1/auth/login",
  tags: ["Auth"],
  summary: "Sign in with email and password",
  request: {
    body: { content: { "application/json": { schema: loginSchema } } },
  },
  responses: {
    200: {
      description: "Signed in. Sets the session cookie.",
      content: { "application/json": { schema: userEnvelope } },
    },
    400: badRequest,
    401: unauthorized,
    429: tooManyRequests,
    500: serverError,
  },
});

registry.registerPath({
  method: "post",
  path: "/api/v1/auth/signup",
  tags: ["Auth"],
  summary: "Create an owner account",
  description:
    "Every account created this way gets the 'owner' role. admin/superadmin accounts are created directly in the database — there's no self-serve signup for those.",
  request: {
    body: { content: { "application/json": { schema: signupSchema } } },
  },
  responses: {
    201: {
      description: "Account created and signed in. Sets the session cookie.",
      content: { "application/json": { schema: userEnvelope } },
    },
    400: badRequest,
    409: duplicateEntry,
    429: tooManyRequests,
    500: serverError,
  },
});

registry.registerPath({
  method: "post",
  path: "/api/v1/auth/logout",
  tags: ["Auth"],
  summary: "Sign out",
  responses: {
    200: {
      description: "Signed out. Clears the session cookie.",
      content: { "application/json": { schema: messageResponseSchema } },
    },
    500: serverError,
  },
});

registry.registerPath({
  method: "get",
  path: "/api/v1/auth/me",
  tags: ["Auth"],
  summary: "Get the signed-in user",
  security: [{ [SESSION_COOKIE_AUTH]: [] }],
  responses: {
    200: {
      description: "The current session's user.",
      content: { "application/json": { schema: userEnvelope } },
    },
    401: unauthorized,
  },
});

registry.registerPath({
  method: "post",
  path: "/api/v1/auth/forgot-password",
  tags: ["Auth"],
  summary: "Email a password-reset link",
  description:
    "Always answers 200 with the same message, whether or not the email has an account, so this endpoint doesn't reveal who is signed up. If it does, the owner gets a link to /auth/reset-password?token=… on the web app, valid for 15 minutes. Shares its rate limit with Better Auth's own /api/auth/request-password-reset.",
  request: {
    body: {
      content: { "application/json": { schema: forgotPasswordSchema } },
    },
  },
  responses: {
    200: {
      description: "Reset link sent, if the account exists.",
      content: { "application/json": { schema: messageResponseSchema } },
    },
    400: badRequest,
    429: tooManyRequests,
    500: serverError,
  },
});

registry.registerPath({
  method: "post",
  path: "/api/v1/auth/reset-password",
  tags: ["Auth"],
  summary: "Set a new password from a reset link",
  description:
    "The token from the emailed link works once. An unknown, used or expired token fails with 400 INVALID_TOKEN. On success the account's other outstanding reset links stop working, every existing session is signed out, no new one is started (the owner logs in with the new password), and a 'password changed' email is sent. Tokens are stored only as a SHA-256 hash.",
  request: {
    body: {
      content: { "application/json": { schema: resetPasswordSchema } },
    },
  },
  responses: {
    200: {
      description: "Password changed; all sessions signed out.",
      content: { "application/json": { schema: messageResponseSchema } },
    },
    400: errorResponse(
      "Validation failed (VALIDATION_FAILED), or the link's token is unknown, used or expired (INVALID_TOKEN).",
    ),
    429: tooManyRequests,
    500: serverError,
  },
});

registry.registerPath({
  method: "post",
  path: "/api/v1/auth/change-password",
  tags: ["Auth"],
  summary: "Change the signed-in user's password",
  description:
    "Needs the current password. On success every session on the account is signed out, this one included, and this browser is given a new session cookie, so it stays signed in while every other device is signed out. The account's outstanding reset links stop working, and a 'password changed' email is sent. A wrong current password fails with 400 VALIDATION_FAILED on the currentPassword field (not 401, which means the session is gone). An account with no password yet gets 409 CONFLICT. Changes to one account run one at a time. Limited to 5 attempts per account and 20 per IP every 15 minutes. Better Auth's own /api/auth/change-password is switched off, so this is the only way for a signed-in user to change their own password (a reset link is the other way in).",
  security: [{ [SESSION_COOKIE_AUTH]: [] }],
  request: {
    body: {
      content: { "application/json": { schema: changePasswordSchema } },
    },
  },
  responses: {
    200: {
      description:
        "Password changed. Sets a new session cookie; every other session is signed out.",
      content: { "application/json": { schema: messageResponseSchema } },
    },
    400: badRequest,
    401: unauthorized,
    409: conflict,
    429: tooManyRequests,
    500: serverError,
  },
});

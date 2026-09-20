import { z } from "zod";
import { loginSchema, signupSchema, userSchema } from "@repo/types";
import { registry, SESSION_COOKIE_AUTH } from "../registry";
import { apiSuccessSchema } from "../schemas";
import {
  badRequest,
  duplicateEntry,
  serverError,
  unauthorized,
} from "../common-responses";

const userEnvelope = apiSuccessSchema(z.object({ user: userSchema }));

const logoutResponseSchema = z.object({
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
      content: { "application/json": { schema: logoutResponseSchema } },
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

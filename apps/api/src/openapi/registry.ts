import {
  OpenAPIRegistry,
  extendZodWithOpenApi,
} from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

// Adds the `.openapi()` method to every zod schema, including ones already
// built in @repo/types — both packages resolve to the same zod install, so
// this one call patches the schemas everywhere they're imported from.
extendZodWithOpenApi(z);

export const registry = new OpenAPIRegistry();

// Better Auth issues a session cookie on login/signup; every owner/admin
// route past that point relies on it being sent back, not a bearer header.
export const SESSION_COOKIE_AUTH = "sessionCookie";

registry.registerComponent("securitySchemes", SESSION_COOKIE_AUTH, {
  type: "apiKey",
  in: "cookie",
  name: "better-auth.session_token",
  description:
    "Session cookie set by Better Auth after a successful POST /api/v1/auth/login or /api/v1/auth/signup.",
});

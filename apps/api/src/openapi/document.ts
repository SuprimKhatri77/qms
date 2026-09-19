import { OpenApiGeneratorV31 } from "@asteasolutions/zod-to-openapi";
import { registry } from "./registry";

// Importing these for their side effect: each one calls
// registry.registerPath(...) against the shared registry above.
import "./paths/auth.paths";
import "./paths/shops.paths";
import "./paths/queue.paths";
import "./paths/history.paths";
import "./paths/public.paths";
import "./paths/admin.paths";

export function buildOpenApiDocument() {
  const generator = new OpenApiGeneratorV31(registry.definitions);

  return generator.generateDocument({
    openapi: "3.1.0",
    info: {
      title: "Palo API",
      version: "1.0.0",
      description:
        "Queue management API: shop owners run a queue, customers join it with no account, and admins oversee the platform. Every response uses the { success, message, data } envelope on success, or { success: false, message, code, errors? } on failure — see ErrorCode in @repo/types for the full list of codes.",
    },
    servers: [
      { url: "http://localhost:5000", description: "Local development" },
    ],
  });
}

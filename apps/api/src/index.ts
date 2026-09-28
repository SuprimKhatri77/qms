import express, { Router } from "express";
import { auth } from "./lib/auth";
import { toNodeHandler } from "better-auth/node";
import cors from "cors";
import { apiReference } from "@scalar/express-api-reference";
import { routes } from "./routes";
import { buildOpenApiDocument } from "./openapi/document";
import { rateLimit } from "./middlewares/rate-limit";
import { requireCanonicalPath } from "./middlewares/require-canonical-path";
import {
  EXPIRY_SWEEP_INTERVAL_MS,
  runExpirySweep,
} from "./services/queue/expire-finished-queues.service";
import {
  authEmailRules,
  loginRules,
  signupRules,
} from "./lib/rate-limit/rules";

const allowedOrigins = [
  "http://localhost:3000",
  process.env.FRONTEND_URL,
].filter(Boolean) as string[];

const app = express();
const v1 = Router();

// How many proxies in front of the API to trust for the client's real IP
// (X-Forwarded-For), which the rate limiter keys on. 0, the default, trusts
// none: otherwise anyone could send a fake X-Forwarded-For and get a fresh
// rate limit per request. In production, set it to the number of proxies
// (e.g. 1 behind a single load balancer).
const trustProxyHops = Number(process.env.TRUST_PROXY_HOPS ?? 0);
if (!Number.isInteger(trustProxyHops) || trustProxyHops < 0) {
  throw new Error("TRUST_PROXY_HOPS must be a whole number, 0 or more");
}
app.set("trust proxy", trustProxyHops);

app.use(cors({ origin: allowedOrigins, credentials: true }));

// Better Auth's own routes are mounted as-is below and are reachable even
// though the web app only uses /api/v1/auth/*. Without limits here, they'd
// be a way around the ones on /api/v1/auth/login and /signup.
//
// requireCanonicalPath runs first so that these exact-path limits can't be
// dodged with a path like "/api/auth/./sign-in/email" (see its comment).
//
// The body is parsed first so the rules can read the email; Better Auth's
// handler accepts an already-parsed body. Both formats Better Auth accepts
// are parsed: with JSON alone, a form-encoded request would reach Better
// Auth with no email for the per-email rules to count, and skip them.
const parseAuthBody = [express.json(), express.urlencoded({ extended: false })];
app.all("/api/auth/{*any}", requireCanonicalPath);
app.post("/api/auth/sign-in/email", parseAuthBody, rateLimit(loginRules));
app.post("/api/auth/sign-up/email", parseAuthBody, rateLimit(signupRules));
app.post(
  ["/api/auth/request-password-reset", "/api/auth/send-verification-email"],
  parseAuthBody,
  rateLimit(authEmailRules),
);
app.all("/api/auth/{*any}", toNodeHandler(auth));
app.use(express.json());

app.use("/api/v1", v1);

v1.get("/health", (req, res) => {
  res.status(200).json({ message: "API is running." });
});

// Docs. Built once at startup, not per-request: registerPath calls in
// src/openapi/paths/*.ts only ever add to the same fixed set of routes.
// Scalar's UI fetches the spec itself from /docs.json rather than being
// handed it directly — its own recommendation over embedding the document.
const openApiDocument = buildOpenApiDocument();
app.get("/docs.json", (req, res) => res.json(openApiDocument));
app.use("/docs", apiReference({ url: "/docs.json" }));

v1.use(routes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Closes queues whose hours are up or whose day has ended, and expires the
// tickets left in them. Once now, to catch up after downtime, then on a timer.
void runExpirySweep();
setInterval(() => void runExpirySweep(), EXPIRY_SWEEP_INTERVAL_MS);

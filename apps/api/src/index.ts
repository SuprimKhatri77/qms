import express, { Router } from "express";
import { auth } from "./lib/auth";
import { toNodeHandler } from "better-auth/node";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import { routes } from "./routes";
import { buildOpenApiDocument } from "./openapi/document";

const allowedOrigins = [
  "http://localhost:3000",
  process.env.FRONTEND_URL,
].filter(Boolean) as string[];

const app = express();
const v1 = Router();

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.all("/api/auth/{*any}", toNodeHandler(auth));
app.use(express.json());

app.use("/api/v1", v1);

v1.get("/health", (req, res) => {
  res.status(200).json({ message: "API is running." });
});

// Docs. Built once at startup, not per-request: registerPath calls in
// src/openapi/paths/*.ts only ever add to the same fixed set of routes.
const openApiDocument = buildOpenApiDocument();
app.get("/docs.json", (req, res) => res.json(openApiDocument));
app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));

v1.use(routes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

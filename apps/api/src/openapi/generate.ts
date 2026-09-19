// Writes the OpenAPI document to a static file, for tools (Postman,
// Redoc, etc.) that want a file instead of hitting the live /docs.json
// endpoint. Run with `bun run docs:generate` from apps/api, or `bun run
// docs:generate` from the repo root.
import { buildOpenApiDocument } from "./document";

const document = buildOpenApiDocument();
const outputPath = new URL("../../openapi.json", import.meta.url);

await Bun.write(outputPath, JSON.stringify(document, null, 2));

console.log(`Wrote ${outputPath.pathname}`);

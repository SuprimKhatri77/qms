import * as dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";

const nodeEnv = process.env.NODE_ENV ?? "development";
const envFile =
  nodeEnv === "development" ? ".env.development" : `.env.${nodeEnv}`;

dotenv.config({ path: envFile });

if (!process.env.DATABASE_URL) {
  throw new Error(`DATABASE_URL is not provided in ${envFile}`);
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  migrations: {
    table: "__drizzle_migrations",
    schema: "public",
  },
  verbose: true,
  strict: true,
});

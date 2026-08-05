import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import dotenv from "dotenv";

const nodeEnv = process.env.NODE_ENV ?? "development";
const envFile =
  nodeEnv === "development" ? ".env.development" : `.env.${nodeEnv}`;

dotenv.config({ path: envFile });

if (!process.env.DATABASE_URL) {
  throw new Error(`DATABASE_URL is not provided in ${envFile}`);
}

const client = postgres(process.env.DATABASE_URL, { max: 10 });

export const db = drizzle(client, { schema });

export { client };

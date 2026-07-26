import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import dotenv from "dotenv";

dotenv.config({ path: ".env.development" });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not provided in .env");
}

const client = postgres(process.env.DATABASE_URL, { max: 10 });

export const db = drizzle(client, { schema });

export { client };

import { migrate } from "drizzle-orm/postgres-js/migrator";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as dotenv from "dotenv";

const nodeEnv = process.env.NODE_ENV ?? "development";
const envFile =
  nodeEnv === "development" ? ".env.development" : `.env.${nodeEnv}`;

dotenv.config({ path: envFile });

if (!process.env.DATABASE_URL) {
  throw new Error(`DATABASE_URL is not provided in ${envFile}`);
}

async function runMigration() {
  const client = postgres(process.env.DATABASE_URL!, { max: 1 });
  try {
    const db = drizzle(client);
    await migrate(db, { migrationsFolder: "./drizzle" });
    console.log("All migrations ran successfully!");
  } catch (error) {
    console.error("Error migrating: ", error);
    process.exit(1);
  } finally {
    await client.end();
  }
}
runMigration();

import * as dotenv from "dotenv";
import { authSchema } from "@repo/types";

// Entry point for `bun run db:seed`: creates the first superadmin plus demo
// owners, shops and queue history (see seed-demo-data.ts for what exactly).
//
// This file only does the safety checks. The seeding code is imported
// *after* them (the `await import` below) on purpose: importing it loads the
// database client and Better Auth, and neither should even start up when the
// checks fail, e.g. against a production database.

// Same env-file convention as migrate.ts and db/index.ts.
const nodeEnv = process.env.NODE_ENV ?? "development";
const envFile =
  nodeEnv === "development" ? ".env.development" : `.env.${nodeEnv}`;

dotenv.config({ path: envFile });

type SeedCheck = { ok: true; password: string } | { ok: false; reason: string };

// Returns the password every seeded account gets, or explains why seeding
// must not run. Returning the reason (instead of exiting right here) keeps
// the one place that decides the exit code in main().
function checkSafeToSeed(): SeedCheck {
  // Demo accounts with a shared password must never exist in production.
  if (nodeEnv === "production") {
    return {
      ok: false,
      reason: "Refusing to seed demo data when NODE_ENV=production.",
    };
  }

  // The password comes from the environment so none is ever committed to the
  // repo; it's the same for every seeded account to keep demos simple.
  const password = process.env.SEED_PASSWORD;
  if (!password) {
    return {
      ok: false,
      reason:
        "SEED_PASSWORD is not set. Run e.g. `SEED_PASSWORD=<a password> bun run db:seed`.",
    };
  }

  // Same length rule as the login form, so the seeded accounts can log in.
  const passwordCheck = authSchema.shape.password.safeParse(password);
  if (!passwordCheck.success) {
    return {
      ok: false,
      reason: `SEED_PASSWORD is invalid: ${passwordCheck.error.issues[0]?.message}`,
    };
  }

  return { ok: true, password };
}

async function main() {
  const check = checkSafeToSeed();
  if (!check.ok) {
    console.error(check.reason);
    process.exitCode = 1;
    return;
  }

  const { client } = await import("./index");
  const { seedDemoData } = await import("./seed-demo-data");

  try {
    await seedDemoData(check.password);
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exitCode = 1;
  } finally {
    // Close the connection pool, otherwise the open connections keep the
    // process running after the seed is done.
    await client.end();
  }
}

main();

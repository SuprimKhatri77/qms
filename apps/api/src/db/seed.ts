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

// Hosts a development database lives on: this machine, or the `db` service
// of the Docker Compose setup. A seed pointed anywhere else is far more
// likely to be a mistake (an exported production DATABASE_URL) than a demo.
const LOCAL_DATABASE_HOSTS = ["localhost", "127.0.0.1", "::1", "db"];

// Where DATABASE_URL points, without the username or password, so it can be
// shown to the person running the seed. null if it isn't a valid URL.
function describeDatabase(): { host: string; name: string } | null {
  try {
    const url = new URL(process.env.DATABASE_URL ?? "");
    return {
      // URL keeps IPv6 hosts in brackets ("[::1]").
      host: url.hostname.replace(/^\[|\]$/g, ""),
      name: url.pathname.slice(1),
    };
  } catch {
    return null;
  }
}

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

  // NODE_ENV alone isn't enough: a shell with a production DATABASE_URL
  // exported (say, for a manual migration) and NODE_ENV unset would seed
  // production, leaving a superadmin with a password the operator knows.
  // So the database itself has to look local, unless explicitly allowed.
  const database = describeDatabase();
  if (!database) {
    return { ok: false, reason: "DATABASE_URL is missing or not a valid URL." };
  }
  const isLocal = LOCAL_DATABASE_HOSTS.includes(database.host);
  if (!isLocal && process.env.SEED_ALLOW_REMOTE_DB !== "1") {
    return {
      ok: false,
      reason: `Refusing to seed "${database.name}" on ${database.host}: it isn't a local database. If this really is a demo database, set SEED_ALLOW_REMOTE_DB=1.`,
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

  const database = describeDatabase();
  console.log(`Seeding "${database?.name}" on ${database?.host}...`);

  // Loaded inside the try, so a failure while connecting is reported the
  // same way as any other seeding failure.
  let client: { end: () => Promise<void> } | undefined;
  try {
    ({ client } = await import("./index"));
    const { seedDemoData } = await import("./seed-demo-data");
    await seedDemoData(check.password);
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exitCode = 1;
  } finally {
    // Close the connection pool, otherwise the open connections keep the
    // process running after the seed is done.
    await client?.end();
  }
}

main();

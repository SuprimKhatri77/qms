# QMS

**Queue Management System** — 4th-semester project (Nepal).

## About

**QMS** = Queue Management System.

**Problem:** At walk-in places — barber shops, clinics, and anywhere a physical queue forms — customers often wait on-site with no idea when their turn is. That wastes time and piles up the crowd.

**Solution:** Wherever there’s a queue, the owner gets a QR code for it. Customers scan, register remotely, and get notified when their turn is near — **email for now**, SMS later — so they can arrive closer to their slot. Less crowding, clearer queue management.

## Features

- **Shop owners** — sign up, set up a shop, open/close today's queue, call the next customer, mark a ticket done or no-show, and view analytics (wait times, no-show rate, daily/hourly load).
- **Customers** — no account needed. Scan the shop's QR code, join with a name and email, and track their live position on a public status page.
- **Turn-alert emails** — customers within striking distance of being called get an automatic email, sent the moment `call next` moves the queue forward.
- **Superadmin panel** — a platform-wide view for admin/superadmin accounts: list every shop and suspend/reactivate one, cross-shop analytics, and a system log of things like failed emails or unexpected errors.

## Architecture

Turborepo monorepo with Bun: Next.js frontend and Express API backed by PostgreSQL. Apps talk over HTTP; shared types live in a workspace package.

```text
┌─────────────┐     HTTP      ┌─────────────────┐     SQL      ┌────────────┐
│  web (Next) │ ────────────► │  api (Express)  │ ───────────► │ PostgreSQL │
│  :3000      │               │  :5000          │              │  :5432     │
└─────────────┘               └────────┬────────┘              └────────────┘
                                       │
                              Better Auth (/api/auth)
                              App routes (/api/v1/*)
```

| Path                         | Role                                       |
| ---------------------------- | ------------------------------------------ |
| `apps/web`                   | Next.js UI (React Query, Tailwind, shadcn) |
| `apps/api`                   | Express API, Better Auth, Drizzle ORM      |
| `packages/types`             | Shared Zod / TypeScript types              |
| `packages/ui`                | Shared UI components                       |
| `packages/eslint-config`     | Shared ESLint config                       |
| `packages/typescript-config` | Shared TSConfig                            |

### API routing

- Auth: `/api/auth/*` (Better Auth — not version-prefixed)
- App: `/api/v1/*` (e.g. `GET /api/v1/health`)
- Admin: `/api/v1/admin/*` — gated to `admin`/`superadmin` roles (shops, platform analytics, system logs)

### Database

- Drizzle + `postgres.js` against any Postgres URL
- Local Docker Postgres in development; Neon (or any hosted Postgres) in production via `DATABASE_URL`

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) + Docker Compose (for containerized dev)
- Node ≥ 18 (engines field; Bun is the package manager)

### Recommended: install Bun

1. Install Bun from the official site: [bun.sh](https://bun.sh)
2. Verify the install:

   ```bash
   bun -v
   ```

   You should see a version ≥ `1.3`.

### Optional: Turborepo CLI

This repo already depends on [Turborepo](https://turborepo.dev). After `bun install`, prefer:

```bash
bun run dev
```

That runs Turbo from the workspace and starts all apps from the root.

If you want the global CLI (`turbo dev` without `bun run`):

1. Install from [turborepo.dev](https://turborepo.dev/docs/getting-started/installation)
2. Verify:

   ```bash
   turbo --version
   ```

Then from the repo root you can use either `bun run dev` or `turbo dev`.

## Quick start (Docker)

Recommended for full-stack local development (web + api + Postgres).

```bash
cp .env.example .env.local
# edit secrets if needed

bun run docker:dev:up
```

| Service  | URL                                   |
| -------- | ------------------------------------- |
| Web      | <http://localhost:3000>               |
| API      | <http://localhost:5000>               |
| Health   | <http://localhost:5000/api/v1/health> |
| Postgres | `localhost:5432`                      |

Stop:

```bash
bun run docker:dev:down
```

Compose file: [`docker-compose.dev.yml`](docker-compose.dev.yml). Inside Docker, the API uses hostname `db` for Postgres (set via compose `DATABASE_URL` override).

## Local development (without Docker for apps)

1. Start Postgres (Docker DB only is fine):

   ```bash
   docker compose --env-file .env.local -f docker-compose.dev.yml up db -d
   ```

2. Install dependencies, set env, and run everything from the root (Turbo):

   ```bash
   bun install
   cp .env.example .env.local
   # point apps/api at local Postgres, e.g. in apps/api/.env.development:
   # DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres

   bun run dev
   # or, if you installed the global CLI: turbo dev
   ```

Filter a single app:

```bash
bun run dev --filter=web
bun run dev --filter=api
```

### Database commands (api)

From `apps/api` (or with `--filter=api`):

```bash
bun run db:generate   # create migrations
bun run db:migrate    # apply migrations
bun run db:push       # push schema (dev)
bun run db:studio     # Drizzle Studio
```

## Scripts (root)

| Script                    | Description                    |
| ------------------------- | ------------------------------ |
| `bun run dev`             | Start all apps via Turbo       |
| `bun run build`           | Build all packages/apps        |
| `bun run check-types`     | Typecheck across the monorepo  |
| `bun run lint`            | Lint via Turbo                 |
| `bun run format`          | Prettier write                 |
| `bun run docker:dev:up`   | Build & start Docker dev stack |
| `bun run docker:dev:down` | Stop Docker dev stack          |

## Environment

Copy [`.env.example`](.env.example) → `.env.local` at the repo root (used by Compose). Do not commit `.env.local`.

| Variable                            | Purpose                                       |
| ----------------------------------- | --------------------------------------------- |
| `POSTGRES_USER` / `PASSWORD` / `DB` | Local Postgres credentials                    |
| `DATABASE_URL`                      | Postgres connection string (host apps / Neon) |
| `PORT`                              | API port (default `5000`)                     |
| `BETTER_AUTH_SECRET`                | Auth signing secret                           |
| `BETTER_AUTH_URL`                   | API public URL for Better Auth                |
| `FRONTEND_URL`                      | Web origin for CORS / emails                  |

## Tooling

- **Husky** — pre-commit runs lint-staged (Prettier); pre-push runs typecheck + build
- **Turbo** — task orchestration and caching
- **TypeScript** everywhere

## License

Licensed under the [MIT License](LICENSE).

// Client-safe exports only, same rule as modules/shop/index.ts:
// getCurrentUserFromApi is server-only (imports next/headers) and is
// imported directly from its own path instead.
export { DashboardShell } from "./dashboard-shell";
export { PageHeader } from "./page-header";

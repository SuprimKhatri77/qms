import type { User } from "@repo/types";

// Where each role lands after signing in. Shared by the login/signup forms and
// the proxy, so both agree on the same destinations.
export function getHomePath(role: User["role"]): string {
  return role === "owner" ? "/shop" : "/admin";
}

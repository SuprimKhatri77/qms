import { ROLE_RULES } from "@/lib/middleware/config";

export const AUTH_ENDPOINTS = [
  "/auth/login",
  "/auth/signup",
  "/auth/logout",
  "/auth/me",
];
export const PROTECTED_PATHS = Object.keys(ROLE_RULES);

export function isProtectedPath(pathname: string) {
  return PROTECTED_PATHS.some((path) => pathname.startsWith(path));
}

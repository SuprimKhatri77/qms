export const ROLE_RULES: Record<string, string[]> = {
  "/admin": ["admin", "superadmin"],
  "/shop": ["owner"],
};

export const UNAUTHENTICATED_ONLY_ROUTES = ["/auth"];

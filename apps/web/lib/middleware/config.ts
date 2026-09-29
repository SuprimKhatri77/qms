export const ROLE_RULES: Record<string, string[]> = {
  "/admin": ["admin", "superadmin"],
  "/shop": ["owner"],
};

export const UNAUTHENTICATED_ONLY_ROUTES = ["/auth"];

// Under /auth, but open whether or not you're signed in. A reset link is
// often opened in a browser that's still logged in; redirecting it to the
// dashboard would make the link silently do nothing. The same goes for the
// forgot page, which the reset page links to when a link has expired. The
// reset signs every session out anyway, so the flow ends on the login screen.
export const AUTH_ROUTES_OPEN_TO_EVERYONE = [
  "/auth/forgot-password",
  "/auth/reset-password",
];

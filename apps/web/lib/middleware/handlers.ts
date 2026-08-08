import { NextRequest, NextResponse } from "next/server";
import { redirectForRole, redirectTo } from "./redirects";
import { getSessionFromApi } from "./session";

export async function handleAuthRoute(req: NextRequest): Promise<NextResponse> {
  const user = await getSessionFromApi(req);

  if (!user) {
    return NextResponse.next();
  }

  const roleRedirect = redirectForRole(req, user.role);
  if (roleRedirect) return roleRedirect;

  return NextResponse.next();
}

export async function handleProtectedRoute(
  req: NextRequest,
  requiredRoles: string[],
): Promise<NextResponse> {
  const user = await getSessionFromApi(req);

  if (!user) {
    return redirectTo(req, "/auth/login");
  }

  if (!requiredRoles.includes(user.role)) {
    return redirectTo(req, "/");
  }

  return NextResponse.next();
}

import { NextRequest, NextResponse } from "next/server";
import { getHomePath } from "@/lib/home-path";

export function redirectTo(req: NextRequest, path: string) {
  return NextResponse.redirect(new URL(path, req.url));
}

export function redirectForRole(
  req: NextRequest,
  role: string,
): NextResponse | null {
  if (role === "admin" || role === "superadmin" || role === "owner") {
    return redirectTo(req, getHomePath(role));
  }

  return null;
}

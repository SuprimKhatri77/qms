import type { Request } from "express";
import type { auth } from "@/lib/auth";
import type { fromNodeHeaders } from "better-auth/node";

export type HeadersType = ReturnType<typeof fromNodeHeaders>;
export type Session = Awaited<ReturnType<typeof auth.api.getSession>>;
export type User = NonNullable<Session>["user"];

export type AuthenticatedRequest = Request & {
  session: NonNullable<Session>;
  user: User;
};

export function assertAuthenticated(
  req: Request,
): asserts req is AuthenticatedRequest {
  if (!req.session || !req.user) {
    throw new Error("Expected authenticated request");
  }
}

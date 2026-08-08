import type { auth } from "@/lib/auth";
import type { fromNodeHeaders } from "better-auth/node";

export type HeadersType = ReturnType<typeof fromNodeHeaders>;
export type Session = Awaited<ReturnType<typeof auth.api.getSession>>;
export type User = NonNullable<Session>["user"];

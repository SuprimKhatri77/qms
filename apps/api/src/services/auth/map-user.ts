import type { User } from "@repo/types";

export function toApiUser(user: {
  id: string;
  name: string;
  email: string;
  role?: string | null;
  image?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}): User {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: (user.role ?? "owner") as User["role"],
    imageUrl: user.image ?? undefined,
    createdAt:
      user.createdAt instanceof Date
        ? user.createdAt.toISOString()
        : String(user.createdAt),
    updatedAt:
      user.updatedAt instanceof Date
        ? user.updatedAt.toISOString()
        : String(user.updatedAt),
  };
}

export function getSetCookies(headers: Headers): string[] {
  if (typeof headers.getSetCookie === "function") {
    return headers.getSetCookie();
  }

  const cookie = headers.get("set-cookie");
  return cookie ? [cookie] : [];
}

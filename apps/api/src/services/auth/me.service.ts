import type { MeResponse } from "@repo/types";
import type { User as AuthUser } from "@/types";
import { toApiUser } from "./map-user";

export function getMe(user: AuthUser): MeResponse {
  return {
    success: true,
    message: "Session retrieved successfully",
    data: { user: toApiUser(user) },
  };
}

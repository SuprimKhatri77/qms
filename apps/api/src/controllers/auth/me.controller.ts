import type { Request, Response } from "express";
import type { MeResponse } from "@repo/types";
import { assertAuthenticated } from "@/types";
import { getMe } from "@/services/auth/me.service";

export async function meController(req: Request, res: Response<MeResponse>) {
  assertAuthenticated(req);
  return res.status(200).json(getMe(req.user));
}

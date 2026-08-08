import type { Request, Response } from "express";
import type { MeResponse } from "@repo/types";
import { getMe } from "@/services/auth/me.service";

export async function meController(req: Request, res: Response<MeResponse>) {
  return res.status(200).json(getMe(req.user));
}

import { Router } from "express";
import { getHistoryController } from "@/controllers/history/get-history.controller";
import { getHistoryDayController } from "@/controllers/history/get-history-day.controller";

// Mounted at /shops/me/history, behind the owner-only auth in routes/shops.ts.
const historyRoutes = Router();

historyRoutes.get("/", getHistoryController);
historyRoutes.get("/:date", getHistoryDayController);

export { historyRoutes };

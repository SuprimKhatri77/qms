import { z } from "zod";
import type { ApiSuccessResponse } from "../base";
import type { PaginationMeta } from "../common";
import type { QueueStatus, QueueTicket, ShopQueue } from "../queue/queue";

const dateSchema = z.iso.date({ error: "Use the format YYYY-MM-DD" });

export const historyQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  // Optional date filter, inclusive on both ends
  from: dateSchema.optional(),
  to: dateSchema.optional(),
});

export type HistoryQuery = z.output<typeof historyQuerySchema>;

export const historyDateParamSchema = dateSchema;

// One row per past day that had at least one ticket.
export type HistoryDay = {
  queueId: string;
  date: string;
  status: QueueStatus;
  customers: number;
  served: number;
  noShows: number;
  avgWaitMinutes: number | null;
};

export type HistoryResponse = ApiSuccessResponse<
  { days: HistoryDay[] },
  PaginationMeta
>;

// Every ticket of one day, including ones that never got verified.
export type HistoryDayDetail = {
  queue: ShopQueue;
  tickets: QueueTicket[];
};

export type HistoryDayResponse = ApiSuccessResponse<HistoryDayDetail>;

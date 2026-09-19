import type { ApiSuccessResponse } from "../base";

// Must stay in sync with `ticketStatusEnum` in apps/api/src/db/schemas/enums.ts.
export type TicketStatus =
  | "pending_verification"
  | "waiting"
  | "serving"
  | "done"
  | "no_show"
  | "cancelled"
  | "expired";

export type QueueStatus = "active" | "closed";

// A customer's ticket as the shop owner sees it. The customer's email is
// deliberately not included: the dashboard doesn't need it.
export type QueueTicket = {
  id: string;
  tokenNumber: number;
  customerName: string;
  customerPhone: string | null;
  status: TicketStatus;
  createdAt: string;
  calledAt: string | null;
};

export type ShopQueue = {
  id: string;
  // Shop-local calendar day, "YYYY-MM-DD"
  date: string;
  status: QueueStatus;
  // The single counter the whole system revolves around
  currentServingNumber: number;
};

// Everything the owner's dashboard needs to draw today's queue.
// Every queue endpoint returns this, so the UI can replace its data with the
// response of any action instead of re-fetching.
export type QueueSnapshot = {
  queue: ShopQueue;
  // The customer being served right now, if any
  serving: QueueTicket | null;
  // Verified customers still waiting, lowest token first
  waiting: QueueTicket[];
  // Finished tickets for today
  stats: {
    done: number;
    noShow: number;
  };
};

export type QueueSnapshotResponse = ApiSuccessResponse<QueueSnapshot>;

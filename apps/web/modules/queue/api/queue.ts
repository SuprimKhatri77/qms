import api from "@/lib/axios";
import { QueueSnapshotResponse } from "@repo/types";

// Every queue endpoint answers with the full, fresh snapshot of today's queue.

export const getShopQueue = async (): Promise<QueueSnapshotResponse> => {
  const res = await api.get<QueueSnapshotResponse>("/shops/me/queue");
  return res.data;
};

export const callNext = async (): Promise<QueueSnapshotResponse> => {
  const res = await api.post<QueueSnapshotResponse>(
    "/shops/me/queue/call-next",
  );
  return res.data;
};

export const markDone = async (
  ticketId: string,
): Promise<QueueSnapshotResponse> => {
  const res = await api.post<QueueSnapshotResponse>(
    `/shops/me/queue/tickets/${ticketId}/done`,
  );
  return res.data;
};

export const markNoShow = async (
  ticketId: string,
): Promise<QueueSnapshotResponse> => {
  const res = await api.post<QueueSnapshotResponse>(
    `/shops/me/queue/tickets/${ticketId}/no-show`,
  );
  return res.data;
};

import api from "@/lib/axios";
import { HistoryDayResponse, HistoryResponse } from "@repo/types";

export type HistoryParams = {
  page: number;
  from?: string;
  to?: string;
};

export const HISTORY_PAGE_SIZE = 15;

export const getHistory = async (
  params: HistoryParams,
): Promise<HistoryResponse> => {
  const res = await api.get<HistoryResponse>("/shops/me/history", {
    params: { ...params, limit: HISTORY_PAGE_SIZE },
  });
  return res.data;
};

export const getHistoryDay = async (
  date: string,
): Promise<HistoryDayResponse> => {
  const res = await api.get<HistoryDayResponse>(`/shops/me/history/${date}`);
  return res.data;
};

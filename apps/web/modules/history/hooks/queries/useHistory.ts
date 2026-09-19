import {
  ApiErrorResponse,
  HistoryDayResponse,
  HistoryResponse,
} from "@repo/types";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { AxiosError } from "axios";
import {
  getHistory,
  getHistoryDay,
  type HistoryParams,
} from "../../api/history";

export const useHistory = (params: HistoryParams) => {
  return useQuery<HistoryResponse, AxiosError<ApiErrorResponse>>({
    queryKey: ["history", params],
    queryFn: () => getHistory(params),
    // Keep the current rows on screen while the next page loads.
    placeholderData: keepPreviousData,
  });
};

export const useHistoryDay = (date: string) => {
  return useQuery<HistoryDayResponse, AxiosError<ApiErrorResponse>>({
    queryKey: ["history-day", date],
    queryFn: () => getHistoryDay(date),
  });
};

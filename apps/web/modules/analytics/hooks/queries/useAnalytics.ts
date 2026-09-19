import { AnalyticsResponse, ApiErrorResponse } from "@repo/types";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { getAnalytics } from "../../api/analytics";

export const useAnalytics = (days: number) => {
  return useQuery<AnalyticsResponse, AxiosError<ApiErrorResponse>>({
    queryKey: ["analytics", days],
    queryFn: () => getAnalytics(days),
    // Keep showing the old range while a new one loads, instead of a blank page.
    placeholderData: keepPreviousData,
  });
};

import api from "@/lib/axios";
import { AnalyticsResponse } from "@repo/types";

export const getAnalytics = async (
  days: number,
): Promise<AnalyticsResponse> => {
  const res = await api.get<AnalyticsResponse>("/shops/me/analytics", {
    params: { days },
  });
  return res.data;
};

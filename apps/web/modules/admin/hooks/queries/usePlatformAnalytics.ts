import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getPlatformAnalytics } from "../../api/admin";

export const usePlatformAnalytics = (days: number) => {
  return useQuery({
    queryKey: ["admin", "analytics", days],
    queryFn: () => getPlatformAnalytics(days),
    placeholderData: keepPreviousData,
  });
};

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { LogLevel } from "@repo/types";
import { listSystemLogs } from "../../api/admin";

export const useSystemLogs = (level: LogLevel | undefined, page: number) => {
  return useQuery({
    queryKey: ["admin", "logs", level ?? "all", page],
    queryFn: () => listSystemLogs({ level, page }),
    placeholderData: keepPreviousData,
  });
};

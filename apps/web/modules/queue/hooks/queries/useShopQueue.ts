import { ApiErrorResponse, QueueSnapshotResponse } from "@repo/types";
import { useQuery } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { getShopQueue } from "../../api/queue";

export const SHOP_QUEUE_KEY = ["shop-queue"];

// How often the dashboard re-reads the queue, so customers who join (or leave)
// show up without the owner refreshing the page.
const POLL_INTERVAL_MS = 5_000;

export const useShopQueue = () => {
  return useQuery<QueueSnapshotResponse, AxiosError<ApiErrorResponse>>({
    queryKey: SHOP_QUEUE_KEY,
    queryFn: getShopQueue,
    refetchInterval: POLL_INTERVAL_MS,
    staleTime: 0,
  });
};

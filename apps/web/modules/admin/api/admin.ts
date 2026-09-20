import api from "@/lib/axios";
import type {
  AdminShopListResponse,
  PlatformAnalyticsResponse,
  SystemLogListResponse,
  UpdateShopStatusRequest,
  UpdateShopStatusResponse,
  LogLevel,
} from "@repo/types";

export const ADMIN_SHOPS_PAGE_SIZE = 20;
export const ADMIN_LOGS_PAGE_SIZE = 50;

export const listAdminShops = async (
  page: number,
): Promise<AdminShopListResponse> => {
  const res = await api.get<AdminShopListResponse>("/admin/shops", {
    params: { page, limit: ADMIN_SHOPS_PAGE_SIZE },
  });
  return res.data;
};

export const updateShopStatus = async ({
  shopId,
  status,
}: {
  shopId: string;
} & UpdateShopStatusRequest): Promise<UpdateShopStatusResponse> => {
  const res = await api.patch<UpdateShopStatusResponse>(
    `/admin/shops/${shopId}/status`,
    { status },
  );
  return res.data;
};

export const getPlatformAnalytics = async (
  days: number,
): Promise<PlatformAnalyticsResponse> => {
  const res = await api.get<PlatformAnalyticsResponse>("/admin/analytics", {
    params: { days },
  });
  return res.data;
};

export type ListSystemLogsParams = {
  level: LogLevel | undefined;
  page: number;
};

export const listSystemLogs = async ({
  level,
  page,
}: ListSystemLogsParams): Promise<SystemLogListResponse> => {
  const res = await api.get<SystemLogListResponse>("/admin/logs", {
    params: { level, page, limit: ADMIN_LOGS_PAGE_SIZE },
  });
  return res.data;
};

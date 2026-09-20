import api from "@/lib/axios";
import type {
  AdminShopListResponse,
  PlatformAnalyticsResponse,
  SystemLogListResponse,
  UpdateShopStatusRequest,
  UpdateShopStatusResponse,
  LogLevel,
} from "@repo/types";

export const listAdminShops = async (): Promise<AdminShopListResponse> => {
  const res = await api.get<AdminShopListResponse>("/admin/shops");
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

export const listSystemLogs = async (
  level: LogLevel | undefined,
): Promise<SystemLogListResponse> => {
  const res = await api.get<SystemLogListResponse>("/admin/logs", {
    params: level ? { level } : undefined,
  });
  return res.data;
};

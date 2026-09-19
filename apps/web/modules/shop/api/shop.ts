import api from "@/lib/axios";
import { CreateShopRequest, CreateShopResponse } from "@repo/types";

export const createShop = async (
  data: CreateShopRequest,
): Promise<CreateShopResponse> => {
  const res = await api.post<CreateShopResponse>("/shops", data);
  return res.data;
};

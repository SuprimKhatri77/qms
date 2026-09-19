import api from "@/lib/axios";
import {
  CreateShopRequest,
  CreateShopResponse,
  GetMyShopResponse,
  UpdateShopRequest,
  UpdateShopResponse,
} from "@repo/types";

export const createShop = async (
  data: CreateShopRequest,
): Promise<CreateShopResponse> => {
  const res = await api.post<CreateShopResponse>("/shops", data);
  return res.data;
};

export const getMyShop = async (): Promise<GetMyShopResponse> => {
  const res = await api.get<GetMyShopResponse>("/shops/me");
  return res.data;
};

export const updateShop = async (
  data: UpdateShopRequest,
): Promise<UpdateShopResponse> => {
  const res = await api.put<UpdateShopResponse>("/shops/me", data);
  return res.data;
};

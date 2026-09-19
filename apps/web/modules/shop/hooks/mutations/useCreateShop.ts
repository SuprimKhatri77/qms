import {
  ApiErrorResponse,
  CreateShopRequest,
  CreateShopResponse,
} from "@repo/types";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { AxiosError } from "axios";
import { toast } from "sonner";
import { createShop } from "../../api/shop";

export const useCreateShop = () => {
  const router = useRouter();

  return useMutation<
    CreateShopResponse,
    AxiosError<ApiErrorResponse>,
    CreateShopRequest
  >({
    mutationFn: createShop,
    onSuccess: (result) => {
      toast.success(result.message);
      router.push("/shop");
      router.refresh();
    },
    onError: (error) => {
      toast.error(
        error.response?.data.message ||
          error.message ||
          "Failed to create shop",
      );
    },
  });
};

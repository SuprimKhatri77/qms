import { LoginRequest, LoginResponse, ApiErrorResponse } from "@repo/types";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { AxiosError } from "axios";
import { login } from "../../api/auth";
import { toast } from "sonner";
import { getHomePath } from "@/lib/home-path";

export const useLogin = () => {
  const router = useRouter();

  return useMutation<LoginResponse, AxiosError<ApiErrorResponse>, LoginRequest>(
    {
      mutationFn: login,
      onSuccess: (result) => {
        toast.success(result.message);
        router.push(getHomePath(result.data.user.role));
        router.refresh();
      },
      onError: (error) => {
        toast.error(
          error.response?.data.message || error.message || "Failed to login",
        );
      },
    },
  );
};

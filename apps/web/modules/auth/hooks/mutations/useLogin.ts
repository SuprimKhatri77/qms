import { LoginRequest, LoginResponse, ApiErrorResponse } from "@repo/types";
import { useMutation } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { login } from "../../api/auth";
import { toast } from "sonner";

export const useLogin = () => {
  return useMutation<LoginResponse, AxiosError<ApiErrorResponse>, LoginRequest>(
    {
      mutationFn: login,
      onSuccess: (result) => {
        toast.success(result.message);
      },
      onError: (error) => {
        toast.error(error.response?.data.message);
      },
    },
  );
};

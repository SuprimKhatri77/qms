import { useMutation } from "@tanstack/react-query";
import { ApiErrorResponse, SignupRequest, SignupResponse } from "@repo/types";
import { AxiosError } from "axios";
import { signup } from "../../api/auth";
import { toast } from "sonner";

export const useSignup = () => {
  return useMutation<
    SignupResponse,
    AxiosError<ApiErrorResponse>,
    SignupRequest
  >({
    mutationFn: signup,
    onSuccess: (result) => {
      toast.success(result.message);
    },
    onError: (error) => {
      toast.error(error.response?.data.message);
    },
  });
};

import {
  ApiErrorResponse,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
} from "@repo/types";
import { useMutation } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { toast } from "sonner";
import { forgotPassword } from "../../api/auth";
import { getRetryAfterSeconds } from "@/lib/rate-limit";

export const useForgotPassword = () => {
  return useMutation<
    ForgotPasswordResponse,
    AxiosError<ApiErrorResponse>,
    ForgotPasswordRequest
  >({
    mutationFn: forgotPassword,
    onError: (error) => {
      // Shown in the form with a live countdown instead.
      if (getRetryAfterSeconds(error) !== null) {
        return;
      }

      toast.error(
        error.response?.data.message ||
          error.message ||
          "Couldn't send the reset link",
      );
    },
  });
};

import {
  ApiErrorResponse,
  ErrorCode,
  ResetPasswordRequest,
  ResetPasswordResponse,
} from "@repo/types";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { AxiosError } from "axios";
import { toast } from "sonner";
import { resetPassword } from "../../api/auth";
import { getRetryAfterSeconds } from "@/lib/rate-limit";

export const useResetPassword = () => {
  const router = useRouter();

  return useMutation<
    ResetPasswordResponse,
    AxiosError<ApiErrorResponse>,
    ResetPasswordRequest
  >({
    mutationFn: resetPassword,
    onSuccess: (result) => {
      toast.success(result.message);
      // Every session was signed out by the reset, so the owner logs in
      // again with the new password. replace, not push: the back button
      // shouldn't return to a page holding a now-used token.
      router.replace("/auth/login");
    },
    onError: (error) => {
      // Both are shown on the page itself: a countdown for a rate limit,
      // and the "invalid link" panel for a used or expired token.
      if (
        getRetryAfterSeconds(error) !== null ||
        error.response?.data.code === ErrorCode.INVALID_TOKEN
      ) {
        return;
      }

      toast.error(
        error.response?.data.message ||
          error.message ||
          "Couldn't reset the password",
      );
    },
  });
};

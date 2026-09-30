import {
  ApiErrorResponse,
  ChangePasswordRequest,
  ChangePasswordResponse,
} from "@repo/types";
import { useMutation } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { toast } from "sonner";
import { changePassword } from "../../api/auth";
import { getRetryAfterSeconds } from "@/lib/rate-limit";

export const useChangePassword = () => {
  return useMutation<
    ChangePasswordResponse,
    AxiosError<ApiErrorResponse>,
    ChangePasswordRequest
  >({
    mutationFn: changePassword,
    onSuccess: (result) => {
      // Nothing to reload: the API already swapped this browser's session
      // cookie for a new one, so the owner stays signed in here.
      toast.success(result.message);
    },
    onError: (error) => {
      // Both are shown in the form itself: a countdown for a rate limit, and
      // field errors such as a wrong current password.
      if (
        getRetryAfterSeconds(error) !== null ||
        error.response?.data.errors?.length
      ) {
        return;
      }

      toast.error(
        error.response?.data.message ||
          error.message ||
          "Couldn't change the password",
      );
    },
  });
};

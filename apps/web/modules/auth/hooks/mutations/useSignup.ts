import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ApiErrorResponse, SignupRequest, SignupResponse } from "@repo/types";
import { AxiosError } from "axios";
import { signup } from "../../api/auth";
import { toast } from "sonner";
import { getHomePath } from "@/lib/home-path";

export const useSignup = () => {
  const router = useRouter();

  return useMutation<
    SignupResponse,
    AxiosError<ApiErrorResponse>,
    SignupRequest
  >({
    mutationFn: signup,
    onSuccess: (result) => {
      toast.success(result.message);
      router.push(getHomePath(result.data.user.role));
      router.refresh();
    },
    onError: (error) => {
      toast.error(
        error.response?.data.message || error.message || "Failed to signup",
      );
    },
  });
};

import { ApiErrorResponse, LogoutResponse } from "@repo/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { AxiosError } from "axios";
import { toast } from "sonner";
import { logout } from "../../api/auth";

export const useLogout = () => {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation<LogoutResponse, AxiosError<ApiErrorResponse>>({
    mutationFn: logout,
    onSuccess: () => {
      // Forget everything cached for this owner, so the next person to sign in
      // on this browser never sees their shop or queue.
      queryClient.clear();
      router.push("/auth/login");
      router.refresh();
    },
    onError: (error) => {
      toast.error(
        error.response?.data.message || error.message || "Failed to sign out",
      );
    },
  });
};

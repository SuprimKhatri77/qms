import {
  ApiErrorResponse,
  JoinQueueRequest,
  JoinQueueResponse,
} from "@repo/types";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { AxiosError } from "axios";
import { toast } from "sonner";
import { joinQueue } from "../../api/join";

export const useJoinQueue = (slug: string) => {
  const router = useRouter();

  return useMutation<
    JoinQueueResponse,
    AxiosError<ApiErrorResponse>,
    JoinQueueRequest
  >({
    mutationFn: (data) => joinQueue(slug, data),
    onSuccess: (result) => {
      toast.success(result.message);
      // The ticket page shows "check your email" itself once it sees
      // pending_verification, so there's nothing else to do here.
      router.push(`/s/${slug}/ticket/${result.data.ticketId}`);
    },
    onError: (error) => {
      toast.error(
        error.response?.data.message ||
          error.message ||
          "Failed to join the queue",
      );
    },
  });
};

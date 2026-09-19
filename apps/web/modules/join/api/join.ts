import api from "@/lib/axios";
import type {
  JoinQueueRequest,
  JoinQueueResponse,
  PublicTicketResponse,
  VerifyTicketResponse,
} from "@repo/types";

export const joinQueue = async (
  slug: string,
  data: JoinQueueRequest,
): Promise<JoinQueueResponse> => {
  const res = await api.post<JoinQueueResponse>(
    `/public/shops/${slug}/tickets`,
    data,
  );
  return res.data;
};

export const verifyTicket = async (
  token: string,
): Promise<VerifyTicketResponse> => {
  const res = await api.post<VerifyTicketResponse>("/public/tickets/verify", {
    token,
  });
  return res.data;
};

export const getPublicTicket = async (
  ticketId: string,
): Promise<PublicTicketResponse> => {
  const res = await api.get<PublicTicketResponse>(
    `/public/tickets/${ticketId}`,
  );
  return res.data;
};

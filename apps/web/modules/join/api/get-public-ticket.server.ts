import { notFound } from "next/navigation";
import type { PublicTicketResponse } from "@repo/types";
import { getApiUrl } from "@/lib/api-url";

// Loads a ticket's status while rendering the customer's ticket page. The
// ticket id in the URL is itself the access control (see the API service for
// why); there's still no cookie to forward.
export async function getPublicTicketFromApi(
  ticketId: string,
): Promise<PublicTicketResponse["data"]> {
  const res = await fetch(`${getApiUrl()}/api/v1/public/tickets/${ticketId}`, {
    cache: "no-store",
  });

  if (res.status === 404) {
    notFound();
  }

  if (!res.ok) {
    throw new Error(`Failed to load ticket (status ${res.status})`);
  }

  const body = (await res.json()) as PublicTicketResponse;
  return body.data;
}

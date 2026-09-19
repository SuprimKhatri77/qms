import type { Metadata } from "next";
import { TicketStatusPage } from "@/modules/join";
import { getPublicTicketFromApi } from "@/modules/join/api/get-public-ticket.server";

type PageProps = {
  params: Promise<{ shopSlug: string; ticketId: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { ticketId } = await params;
  const { shop } = await getPublicTicketFromApi(ticketId);
  return { title: `Your spot at ${shop.name}` };
}

export default async function Page({ params }: PageProps) {
  const { ticketId } = await params;
  const initialData = await getPublicTicketFromApi(ticketId);

  return <TicketStatusPage ticketId={ticketId} initialData={initialData} />;
}

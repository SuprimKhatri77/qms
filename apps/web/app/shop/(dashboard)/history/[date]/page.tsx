import type { Metadata } from "next";
import { HistoryDayPage } from "@/modules/history/history-day-page";

type PageProps = {
  params: Promise<{ date: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { date } = await params;
  return { title: date };
}

export default async function Page({ params }: PageProps) {
  const { date } = await params;
  return <HistoryDayPage date={date} />;
}

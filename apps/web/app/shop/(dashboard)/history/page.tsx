import type { Metadata } from "next";
import { HistoryPage } from "@/modules/history/history-page";

export const metadata: Metadata = {
  title: "History",
};

export default function Page() {
  return <HistoryPage />;
}

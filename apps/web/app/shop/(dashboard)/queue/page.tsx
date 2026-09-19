import type { Metadata } from "next";
import { QueuePage } from "@/modules/queue/queue-page";

export const metadata: Metadata = {
  title: "Live queue",
};

export default function Page() {
  return <QueuePage />;
}

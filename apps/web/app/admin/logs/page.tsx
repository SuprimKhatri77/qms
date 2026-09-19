import type { Metadata } from "next";
import { LogsPage } from "@/modules/admin";

export const metadata: Metadata = {
  title: "System Logs",
};

export default function Page() {
  return <LogsPage />;
}

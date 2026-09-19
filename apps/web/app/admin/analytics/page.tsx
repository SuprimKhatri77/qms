import type { Metadata } from "next";
import { PlatformAnalyticsPage } from "@/modules/admin";

export const metadata: Metadata = {
  title: "Platform Analytics",
};

export default function Page() {
  return <PlatformAnalyticsPage />;
}

import type { Metadata } from "next";
import { SharePage } from "@/modules/share/share-page";

export const metadata: Metadata = {
  title: "Share & QR",
};

export default function Page() {
  return <SharePage />;
}

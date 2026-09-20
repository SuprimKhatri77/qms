import type { Metadata } from "next";
import { ShopsPage } from "@/modules/admin";

export const metadata: Metadata = {
  title: "Shops",
};

export default function Page() {
  return <ShopsPage />;
}

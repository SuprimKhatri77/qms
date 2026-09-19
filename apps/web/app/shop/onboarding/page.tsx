import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OnboardingPage, getMyShopFromApi } from "@/modules/shop";

export const metadata: Metadata = {
  title: "Set up your shop",
};

export default async function Page() {
  const shop = await getMyShopFromApi();

  // One shop per owner: anyone who already has one goes to their dashboard.
  if (shop) {
    redirect("/shop");
  }

  return <OnboardingPage />;
}

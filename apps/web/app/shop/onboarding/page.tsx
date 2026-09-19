import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OnboardingPage } from "@/modules/shop";
import { getMyShopFromApi } from "@/modules/shop/api/get-my-shop.server";

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

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShopDashboardPage, getMyShopFromApi } from "@/modules/shop";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function Page() {
  const shop = await getMyShopFromApi();

  // Signed up but hasn't created a shop yet: finish onboarding first.
  if (!shop) {
    redirect("/shop/onboarding");
  }

  return <ShopDashboardPage shop={shop} />;
}

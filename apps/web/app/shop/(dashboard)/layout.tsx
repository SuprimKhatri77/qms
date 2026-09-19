import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/modules/dashboard";
import { getCurrentUserFromApi } from "@/modules/dashboard/api/get-current-user.server";
import { getMyShopFromApi } from "@/modules/shop/api/get-my-shop.server";

// Wraps every page under /shop except onboarding (which has no sidebar because
// the shop doesn't exist yet).
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [shop, user] = await Promise.all([
    getMyShopFromApi(),
    getCurrentUserFromApi(),
  ]);

  // Signed up but hasn't created a shop yet: finish onboarding first.
  if (!shop) {
    redirect("/shop/onboarding");
  }

  // The sidebar remembers open/closed in a cookie; reading it here avoids a
  // flash of the wrong state on load.
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";

  return (
    <DashboardShell shop={shop} user={user} defaultOpen={defaultOpen}>
      {children}
    </DashboardShell>
  );
}

import type { Metadata } from "next";
import { AccountPage } from "@/modules/admin";
import { getCurrentUserFromApi } from "@/modules/dashboard/api/get-current-user.server";

export const metadata: Metadata = {
  title: "Account",
};

export default async function Page() {
  const user = await getCurrentUserFromApi();

  return <AccountPage user={user} />;
}

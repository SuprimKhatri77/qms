import { cookies } from "next/headers";
import { AdminShell } from "@/modules/admin";
import { getCurrentUserFromApi } from "@/modules/dashboard/api/get-current-user.server";

// Wraps every page under /admin. Role is already enforced by proxy.ts
// (ROLE_RULES in lib/middleware/config.ts) before this ever renders.
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUserFromApi();

  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";

  return (
    <AdminShell user={user} defaultOpen={defaultOpen}>
      {children}
    </AdminShell>
  );
}

"use client";

import type { User } from "@repo/types";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AdminSidebar } from "./admin-sidebar";
import { AdminHeader } from "./admin-header";

type AdminShellProps = {
  user: User;
  defaultOpen: boolean;
  children: React.ReactNode;
};

// Same frame as the owner DashboardShell (modules/dashboard/dashboard-shell.tsx),
// minus ShopProvider: an admin isn't scoped to one shop.
export function AdminShell({ user, defaultOpen, children }: AdminShellProps) {
  return (
    <TooltipProvider>
      <SidebarProvider defaultOpen={defaultOpen}>
        <AdminSidebar user={user} />
        {/* min-w-0 lets this flex item be narrower than its content, so a
            wide table scrolls inside its own box instead of stretching
            the whole page past the screen. */}
        <SidebarInset className="min-w-0">
          <AdminHeader />
          <div className="flex-1 p-4 sm:p-6 lg:p-8">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}

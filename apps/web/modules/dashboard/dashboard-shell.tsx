"use client";

import type { Shop, User } from "@repo/types";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ShopProvider } from "@/modules/shop/shop-provider";
import { AppSidebar } from "./app-sidebar";
import { DashboardHeader } from "./dashboard-header";

type DashboardShellProps = {
  shop: Shop;
  user: User;
  // Whether the sidebar was open last time (remembered in a cookie)
  defaultOpen: boolean;
  children: React.ReactNode;
};

// The frame around every dashboard page: sidebar on the left, top bar, and the
// page itself in the remaining space.
export function DashboardShell({
  shop,
  user,
  defaultOpen,
  children,
}: DashboardShellProps) {
  return (
    <ShopProvider shop={shop}>
      <TooltipProvider>
        <SidebarProvider defaultOpen={defaultOpen}>
          <AppSidebar user={user} />
          <SidebarInset>
            <DashboardHeader />
            <div className="flex-1 p-4 sm:p-6 lg:p-8">{children}</div>
          </SidebarInset>
        </SidebarProvider>
      </TooltipProvider>
    </ShopProvider>
  );
}

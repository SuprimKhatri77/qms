"use client";

import type { Shop, User } from "@repo/types";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ShopProvider } from "@/modules/shop/shop-provider";
import { AppSidebar } from "./app-sidebar";
import { DashboardHeader } from "./dashboard-header";
import { SuspendedShopBanner } from "./suspended-shop-banner";

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
          {/* min-w-0 lets this flex item be narrower than its content, so a
              wide table scrolls inside its own box instead of stretching
              the whole page past the screen. */}
          <SidebarInset className="min-w-0">
            <DashboardHeader />
            <SuspendedShopBanner />
            <div className="flex-1 p-4 sm:p-6 lg:p-8">{children}</div>
          </SidebarInset>
        </SidebarProvider>
      </TooltipProvider>
    </ShopProvider>
  );
}

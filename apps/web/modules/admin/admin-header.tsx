"use client";

import { usePathname } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { findActiveNavItem } from "./nav-items";

export function AdminHeader() {
  const pathname = usePathname();
  const section = findActiveNavItem(pathname);

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-hairline px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <span className="font-medium text-ink">{section?.title ?? "Admin"}</span>
    </header>
  );
}

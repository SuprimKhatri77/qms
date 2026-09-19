"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { findActiveNavItem } from "./nav-items";

// Top bar: sidebar toggle plus a breadcrumb built from the current path.
// "/shop/history/2026-09-18" -> History / 2026-09-18
export function DashboardHeader() {
  const pathname = usePathname();
  const section = findActiveNavItem(pathname);
  const detail = section
    ? pathname.slice(section.href.length).replace(/^\//, "")
    : "";

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-hairline px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm">
        {detail ? (
          <>
            <Link
              href={section?.href ?? "/shop"}
              className="text-ink-mute hover:text-ink"
            >
              {section?.title}
            </Link>
            <span className="text-ink-faint">/</span>
            <span className="text-ink">{detail}</span>
          </>
        ) : (
          <span className="font-medium text-ink">
            {section?.title ?? "Dashboard"}
          </span>
        )}
      </nav>
    </header>
  );
}

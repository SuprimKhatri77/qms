"use client";

import { usePathname } from "next/navigation";
import type { User } from "@repo/types";
import { Footer } from "./footer";
import { Navbar } from "./navbar";

type NavFooterWrapperProps = {
  initialUser: User | null;
  children: React.ReactNode;
};

export function NavFooterWrapper({
  initialUser,
  children,
}: NavFooterWrapperProps) {
  const pathname = usePathname();
  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
  // The owner dashboard has its own sidebar layout. Onboarding is the one
  // /shop page that keeps the marketing navbar and footer.
  const isDashboard =
    pathname === "/shop" ||
    (pathname.startsWith("/shop/") && !pathname.startsWith("/shop/onboarding"));

  if (isAdmin || isDashboard) {
    return children;
  }

  return (
    <div className="flex min-h-full flex-1 flex-col bg-canvas">
      <Navbar initialUser={initialUser} />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

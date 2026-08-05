"use client";

import { usePathname } from "next/navigation";
import { Footer } from "./footer";
import { Navbar } from "./navbar";

type NavFooterWrapperProps = {
  children: React.ReactNode;
};

export function NavFooterWrapper({ children }: NavFooterWrapperProps) {
  const pathname = usePathname();
  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");

  if (isAdmin) {
    return children;
  }

  return (
    <div className="flex min-h-full flex-1 flex-col bg-canvas">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

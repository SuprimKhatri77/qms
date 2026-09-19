import { ChartColumn, ScrollText, Store, type LucideIcon } from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  // Shops lives at "/admin", a prefix of every other admin page, so it must
  // only count as active on that exact path.
  exact?: boolean;
};

// To add a page: create its route under app/admin/ and add one entry here.
export const NAV_ITEMS: NavItem[] = [
  { title: "Shops", href: "/admin", icon: Store, exact: true },
  { title: "Analytics", href: "/admin/analytics", icon: ChartColumn },
  { title: "Logs", href: "/admin/logs", icon: ScrollText },
];

export function isNavItemActive(item: NavItem, pathname: string): boolean {
  if (item.exact) {
    return pathname === item.href;
  }

  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function findActiveNavItem(pathname: string): NavItem | undefined {
  return NAV_ITEMS.find((item) => isNavItemActive(item, pathname));
}

import {
  ChartColumn,
  History,
  LayoutDashboard,
  ListOrdered,
  QrCode,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  // Overview lives at "/shop", which is a prefix of every other page, so it
  // must only count as active on that exact path.
  exact?: boolean;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

// The dashboard's sidebar. To add a page: create its route under
// app/shop/(dashboard)/ and add one entry here.
export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Run",
    items: [
      { title: "Overview", href: "/shop", icon: LayoutDashboard, exact: true },
      { title: "Live queue", href: "/shop/queue", icon: ListOrdered },
    ],
  },
  {
    label: "Insights",
    items: [
      { title: "Analytics", href: "/shop/analytics", icon: ChartColumn },
      { title: "History", href: "/shop/history", icon: History },
    ],
  },
  {
    label: "Shop",
    items: [
      { title: "Share & QR", href: "/shop/share", icon: QrCode },
      { title: "Settings", href: "/shop/settings", icon: Settings },
    ],
  },
];

const ALL_ITEMS = NAV_GROUPS.flatMap((group) => group.items);

export function isNavItemActive(item: NavItem, pathname: string): boolean {
  if (item.exact) {
    return pathname === item.href;
  }

  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function findActiveNavItem(pathname: string): NavItem | undefined {
  return ALL_ITEMS.find((item) => isNavItemActive(item, pathname));
}

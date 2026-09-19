"use client";

import { createContext, useContext } from "react";
import type { Shop } from "@repo/types";
import { useMyShop } from "./hooks/queries/useMyShop";

const ShopContext = createContext<Shop | null>(null);

// Wraps the dashboard so any page can read the owner's shop with useShop(),
// without each page fetching it again.
export function ShopProvider({
  shop,
  children,
}: {
  shop: Shop;
  children: React.ReactNode;
}) {
  const { data } = useMyShop(shop);

  return <ShopContext.Provider value={data}>{children}</ShopContext.Provider>;
}

export function useShop(): Shop {
  const shop = useContext(ShopContext);

  if (!shop) {
    throw new Error("useShop must be used inside <ShopProvider>");
  }

  return shop;
}

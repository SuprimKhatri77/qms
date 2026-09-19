// Client-safe exports only. `getMyShopFromApi` (server-only, imports
// next/headers) deliberately lives outside this barrel: re-exporting it here
// would pull a server-only import into any client component that imports
// anything else from this file. Server code should import it directly from
// "@/modules/shop/api/get-my-shop.server".
export { OnboardingPage } from "./onboarding-page";
export { ShopProvider, useShop } from "./shop-provider";
export { ShopForm } from "./shop-form";
export { useUpdateShop } from "./hooks/mutations/useUpdateShop";

import type { Shop } from "@repo/types";
import { SHOP_CATEGORY_LABELS } from "@repo/types";
import { Logo } from "@/modules/landing/logo";
import { JoinForm } from "./join-form";

export function JoinPage({ shop }: { shop: Shop }) {
  const location = [shop.area, shop.city].filter(Boolean).join(", ");

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 sm:py-16">
      <div className="w-full max-w-[400px]">
        <div className="mb-8 text-center">
          <Logo className="mx-auto mb-6 justify-center" />
          <h1 className="text-[28px] font-medium leading-[1.2] tracking-[-0.42px] text-ink">
            {shop.name}
          </h1>
          <p className="mt-2 text-sm text-ink-mute">
            {SHOP_CATEGORY_LABELS[shop.category]}
            {location ? ` · ${location}` : ""}
          </p>
        </div>

        <div className="rounded-none border border-hairline bg-canvas p-8 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <JoinForm slug={shop.slug} />
        </div>
      </div>
    </div>
  );
}

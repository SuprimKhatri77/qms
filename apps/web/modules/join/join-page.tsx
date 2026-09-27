import type { Shop } from "@repo/types";
import { SHOP_CATEGORY_LABELS } from "@repo/types";
import { Logo } from "@/modules/landing/logo";
import { JoinForm } from "./join-form";

type JoinPageProps = {
  shop: Shop;
  // False once the owner has closed today's queue to new customers
  queueOpen: boolean;
};

// What goes in the card: the form, or the reason it can't be used. A
// suspended shop is checked first, because an admin's decision outranks
// the owner's open/closed switch.
function JoinCardContent({ shop, queueOpen }: JoinPageProps) {
  if (shop.status === "suspended") {
    return (
      <p className="text-center text-sm text-ink-mute">
        This shop isn&apos;t accepting customers right now.
      </p>
    );
  }

  if (!queueOpen) {
    return (
      <p className="text-center text-sm text-ink-mute">
        This queue is closed for today. Check back later.
      </p>
    );
  }

  return <JoinForm slug={shop.slug} />;
}

export function JoinPage({ shop, queueOpen }: JoinPageProps) {
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
          <JoinCardContent shop={shop} queueOpen={queueOpen} />
        </div>
      </div>
    </div>
  );
}

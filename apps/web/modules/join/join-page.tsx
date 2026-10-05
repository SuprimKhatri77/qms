import type { OpeningHoursStatus, Shop } from "@repo/types";
import { SHOP_CATEGORY_LABELS } from "@repo/types";
import { Logo } from "@/modules/landing/logo";
import { JoinForm } from "./join-form";

type JoinPageProps = {
  shop: Shop;
  // False once the owner has closed today's queue to new customers
  queueOpen: boolean;
  // Whether it's within the shop's opening hours right now
  hoursStatus: OpeningHoursStatus;
};

// What goes in the card: the form, or the reason it can't be used. A
// suspended shop comes first (an admin's decision outranks everything),
// then the owner's switch: a queue closed before opening time won't open at
// all today, so it mustn't say "opens at". Then the opening hours.
function JoinCardContent({ shop, queueOpen, hoursStatus }: JoinPageProps) {
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

  if (hoursStatus === "before_opening") {
    return (
      <p className="text-center text-sm text-ink-mute">
        This queue opens at {shop.openingTime}. Check back then.
      </p>
    );
  }

  if (hoursStatus === "after_closing") {
    return (
      <p className="text-center text-sm text-ink-mute">
        This queue has closed for today. Check back tomorrow.
      </p>
    );
  }

  return <JoinForm slug={shop.slug} />;
}

export function JoinPage({ shop, queueOpen, hoursStatus }: JoinPageProps) {
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
          <JoinCardContent
            shop={shop}
            queueOpen={queueOpen}
            hoursStatus={hoursStatus}
          />
        </div>
      </div>
    </div>
  );
}

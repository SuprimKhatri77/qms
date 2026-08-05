import { LayoutDashboard, ListOrdered, Mail, QrCode } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const features: {
  title: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    title: "Join from a QR",
    description:
      "Scan, enter name and email, confirm with a magic link. No app. No account.",
    icon: QrCode,
  },
  {
    title: "Live place in line",
    description:
      "Call next and every waiting spot recalculates — position is always current.",
    icon: ListOrdered,
  },
  {
    title: "Show up when close",
    description:
      "ETAs and a heads-up email when you're two away. Less standing around.",
    icon: Mail,
  },
  {
    title: "One counter screen",
    description:
      "Today's queue, call next, done or no-show — without paper slips.",
    icon: LayoutDashboard,
  },
];

export function Features() {
  return (
    <section id="features" className="border-b border-hairline bg-canvas">
      <div className="mx-auto max-w-[1280px] px-6 py-20 lg:px-8 lg:py-28">
        <div className="max-w-2xl">
          <h2 className="text-[28px] font-medium leading-[1.2] tracking-[-0.42px] text-ink sm:text-[36px] sm:leading-[1.15] sm:tracking-[-0.72px]">
            Built for the shops that run on walk-ins.
          </h2>
          <p className="mt-5 text-base leading-relaxed text-ink-mute sm:text-lg sm:leading-[1.55]">
            Barbers, clinics, banks, repair counters — anywhere a line forms and
            people&apos;s time matters.
          </p>
        </div>

        <div className="mt-14 grid gap-5 md:grid-cols-2">
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <article
                key={feature.title}
                className="relative overflow-hidden rounded-none border border-hairline bg-canvas p-8 shadow-[0_1px_3px_rgba(0,0,0,0.04)] sm:p-10"
              >
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0"
                  style={{
                    backgroundImage: `
                      linear-gradient(45deg, transparent 49%, #e5e7eb 49%, #e5e7eb 51%, transparent 51%),
                      linear-gradient(-45deg, transparent 49%, #e5e7eb 49%, #e5e7eb 51%, transparent 51%)
                    `,
                    backgroundSize: "40px 40px",
                    WebkitMaskImage:
                      "radial-gradient(ellipse 80% 80% at 100% 0%, #000 50%, transparent 90%)",
                    maskImage:
                      "radial-gradient(ellipse 80% 80% at 100% 0%, #000 50%, transparent 90%)",
                  }}
                />
                <div className="relative">
                  <div className="mb-5 flex size-9 items-center justify-center border border-hairline bg-canvas text-primary">
                    <Icon className="size-4" strokeWidth={1.75} />
                  </div>
                  <h3 className="text-lg font-medium text-ink sm:text-[18px]">
                    {feature.title}
                  </h3>
                  <p className="mt-3 max-w-md text-base leading-relaxed text-ink-mute">
                    {feature.description}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

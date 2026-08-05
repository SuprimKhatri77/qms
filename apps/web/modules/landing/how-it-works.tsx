import {
  Bell,
  LayoutDashboard,
  Link2,
  QrCode,
  Store,
  UserRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const shopSteps: {
  step: string;
  title: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    step: "01",
    title: "Set up your counter",
    description:
      "Create an account, add shop details and average service time, then put your QR at the door.",
    icon: Store,
  },
  {
    step: "02",
    title: "Run today's queue",
    description:
      "Tickets land as customers verify. Tap Call next when you're ready — one counter, one screen.",
    icon: LayoutDashboard,
  },
  {
    step: "03",
    title: "Close each turn",
    description:
      "Mark done or no-show. Waiting positions update for everyone else on their next refresh.",
    icon: Bell,
  },
];

const customerSteps: {
  step: string;
  title: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    step: "01",
    title: "Scan to join",
    description:
      "No app, no account. Enter a name and email from anywhere — in line or still at home.",
    icon: QrCode,
  },
  {
    step: "02",
    title: "Confirm the spot",
    description:
      "A magic link locks you in. Until you verify, you don't count in the live queue.",
    icon: Link2,
  },
  {
    step: "03",
    title: "Watch, then arrive",
    description:
      "Token, position, and ETA tick down live. Get emailed when you're a couple of people away.",
    icon: UserRound,
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="border-b border-hairline bg-canvas">
      <div className="mx-auto max-w-[1280px] px-6 py-20 lg:px-8 lg:py-28">
        <div className="max-w-2xl">
          <h2 className="text-[28px] font-medium leading-[1.2] tracking-[-0.42px] text-ink sm:text-[36px] sm:leading-[1.15] sm:tracking-[-0.72px]">
            How the queue actually works.
          </h2>
          <p className="mt-5 text-base leading-relaxed text-ink-mute sm:text-lg sm:leading-[1.55]">
            Owners run the counter. Customers join remotely. One Call next keeps
            every waiting spot honest.
          </p>
        </div>

        <div className="mt-14 grid gap-4 lg:grid-cols-2">
          <FlowPanel
            id="for-shops"
            eyebrow="For shop owners"
            title="Run the line"
            steps={shopSteps}
          />
          <FlowPanel
            eyebrow="For customers"
            title="Skip the waiting room"
            steps={customerSteps}
            inverted
          />
        </div>

        <div className="mt-4 border border-hairline bg-canvas-soft px-6 py-6 sm:px-8 sm:py-7">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
            <div className="max-w-xl">
              <p className="text-sm font-medium text-ink">
                Position is never stored — it&apos;s computed live.
              </p>
              <p className="mt-2 text-sm leading-relaxed text-ink-mute">
                When the counter advances, every customer&apos;s place is just{" "}
                <span className="font-mono text-[13px] text-ink">
                  token − now serving
                </span>
                . Their status page updates on the next poll.
              </p>
            </div>
            <p className="shrink-0 font-mono text-xs tracking-wide text-ink-faint">
              Call next → everyone moves up
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function FlowPanel({
  id,
  eyebrow,
  title,
  steps,
  inverted = false,
}: {
  id?: string;
  eyebrow: string;
  title: string;
  steps: typeof shopSteps;
  inverted?: boolean;
}) {
  return (
    <div
      id={id}
      className={
        inverted
          ? "flex flex-col border border-transparent bg-canvas-night p-7 sm:p-9"
          : "flex flex-col border border-hairline bg-canvas p-7 sm:p-9"
      }
    >
      <div
        className={
          inverted
            ? "mb-8 border-b border-white/10 pb-6"
            : "mb-8 border-b border-hairline pb-6"
        }
      >
        <p
          className={
            inverted
              ? "text-xs font-medium text-primary"
              : "text-xs font-medium text-ink-mute"
          }
        >
          {eyebrow}
        </p>
        <h3
          className={
            inverted
              ? "mt-2 text-[22px] font-medium tracking-tight text-white"
              : "mt-2 text-[22px] font-medium tracking-tight text-ink"
          }
        >
          {title}
        </h3>
      </div>

      <ol className="flex flex-1 flex-col">
        {steps.map((item, index) => {
          const Icon = item.icon;
          const isLast = index === steps.length - 1;

          return (
            <li key={item.step} className="relative flex gap-4 pb-8 last:pb-0">
              {!isLast ? (
                <span
                  aria-hidden
                  className={
                    inverted
                      ? "absolute left-[15px] top-9 bottom-0 w-px bg-white/10"
                      : "absolute left-[15px] top-9 bottom-0 w-px bg-hairline"
                  }
                />
              ) : null}

              <div
                className={
                  inverted
                    ? "relative z-10 flex size-8 shrink-0 items-center justify-center border border-white/15 bg-canvas-night text-primary"
                    : "relative z-10 flex size-8 shrink-0 items-center justify-center border border-hairline bg-canvas text-ink"
                }
              >
                <Icon className="size-3.5" strokeWidth={1.75} />
              </div>

              <div className="min-w-0 pt-0.5">
                <div className="flex items-baseline gap-3">
                  <span
                    className={
                      inverted
                        ? "font-mono text-[11px] text-white/35"
                        : "font-mono text-[11px] text-ink-faint"
                    }
                  >
                    {item.step}
                  </span>
                  <p
                    className={
                      inverted
                        ? "text-[15px] font-medium text-white"
                        : "text-[15px] font-medium text-ink"
                    }
                  >
                    {item.title}
                  </p>
                </div>
                <p
                  className={
                    inverted
                      ? "mt-2 text-sm leading-relaxed text-white/60"
                      : "mt-2 text-sm leading-relaxed text-ink-mute"
                  }
                >
                  {item.description}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

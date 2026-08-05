import { Quote } from "lucide-react";

const testimonials = [
  {
    quote:
      "We used to lose walk-ins who wouldn't wait. Now they join from outside and show up when they're next.",
    name: "Elena V.",
    role: "Owner, neighborhood barbershop",
    span: "lg:col-span-2 lg:row-span-2",
    featured: true,
  },
  {
    quote:
      "Call next is the whole job. The board stays clear and nobody asks 'how long?' every two minutes.",
    name: "Marcus T.",
    role: "Front desk, dental clinic",
    span: "lg:col-span-1",
  },
  {
    quote:
      "Customers love the magic link. No app. No account — just their spot and an ETA.",
    name: "Priya N.",
    role: "Manager, repair counter",
    span: "lg:col-span-1",
  },
  {
    quote:
      "The email when you're two away cut our no-shows. People leave and come back at the right time.",
    name: "Jonah R.",
    role: "Lead, government service desk",
    span: "lg:col-span-2",
    dark: true,
  },
  {
    quote:
      "Paper tickets are gone. One screen for today's queue is all the staff needs.",
    name: "Amira K.",
    role: "Ops, multi-chair salon",
    span: "lg:col-span-1",
  },
  {
    quote:
      "Position updating live without us pushing anything — that feels magic to customers.",
    name: "Chris L.",
    role: "Owner, walk-in clinic",
    span: "lg:col-span-3",
  },
] as const;

function TestimonialCard({
  quote,
  name,
  role,
  span,
  featured = false,
  dark = false,
}: {
  quote: string;
  name: string;
  role: string;
  span: string;
  featured?: boolean;
  dark?: boolean;
}) {
  return (
    <figure
      className={[
        "relative flex flex-col justify-between overflow-hidden border p-6 sm:p-8",
        span,
        dark
          ? "border-transparent bg-canvas-night text-white"
          : "border-hairline bg-canvas text-ink",
        featured ? "min-h-[280px] sm:min-h-[320px]" : "min-h-[200px]",
      ].join(" ")}
    >
      {!dark ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-80"
          style={{
            backgroundImage: `
              linear-gradient(45deg, transparent 49%, #e5e7eb 49%, #e5e7eb 51%, transparent 51%),
              linear-gradient(-45deg, transparent 49%, #e5e7eb 49%, #e5e7eb 51%, transparent 51%)
            `,
            backgroundSize: "40px 40px",
            WebkitMaskImage:
              "radial-gradient(ellipse 70% 70% at 100% 0%, #000 40%, transparent 85%)",
            maskImage:
              "radial-gradient(ellipse 70% 70% at 100% 0%, #000 40%, transparent 85%)",
          }}
        />
      ) : null}

      <div className="relative">
        <Quote
          aria-hidden
          className="mb-5 size-5 text-primary"
          strokeWidth={1.75}
        />
        <blockquote
          className={[
            "leading-relaxed",
            featured
              ? "text-xl font-medium tracking-tight sm:text-2xl sm:leading-snug"
              : "text-[15px] sm:text-base",
            dark ? "text-white" : "text-ink",
          ].join(" ")}
        >
          &ldquo;{quote}&rdquo;
        </blockquote>
      </div>

      <figcaption
        className={[
          "relative mt-8 border-t pt-4",
          dark ? "border-white/10" : "border-hairline",
        ].join(" ")}
      >
        <p
          className={
            dark
              ? "text-sm font-medium text-white"
              : "text-sm font-medium text-ink"
          }
        >
          {name}
        </p>
        <p
          className={
            dark ? "mt-1 text-xs text-white/55" : "mt-1 text-xs text-ink-mute"
          }
        >
          {role}
        </p>
      </figcaption>
    </figure>
  );
}

export function Testimonials() {
  return (
    <section
      id="testimonials"
      className="border-b border-hairline bg-canvas"
      aria-labelledby="testimonials-heading"
    >
      <div className="mx-auto max-w-[1280px] px-6 py-20 lg:px-8 lg:py-28">
        <div className="max-w-2xl">
          <h2
            id="testimonials-heading"
            className="text-[28px] font-medium leading-[1.2] tracking-[-0.42px] text-ink sm:text-[36px] sm:leading-[1.15] sm:tracking-[-0.72px]"
          >
            From the shops already clearing the line.
          </h2>
          <p className="mt-5 text-base leading-relaxed text-ink-mute sm:text-lg sm:leading-[1.55]">
            Walk-in counters using Queueup to keep the room calm and the queue
            honest.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:grid-rows-[auto_auto_auto]">
          {testimonials.map((item) => (
            <TestimonialCard
              key={item.name}
              quote={item.quote}
              name={item.name}
              role={item.role}
              span={item.span}
              featured={"featured" in item ? item.featured : false}
              dark={"dark" in item ? item.dark : false}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

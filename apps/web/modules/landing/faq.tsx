import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "Do customers need an account?",
    answer:
      "No. Customers scan a QR (or find your shop), enter their name and email, and confirm with a magic link. That verification is what holds their spot — until then they aren't in the live queue.",
  },
  {
    question: "How does position in line update?",
    answer:
      "Position isn't stored per person. It's calculated live from token number minus the number currently being served. When you tap Call next, every waiting customer's place updates on their next refresh.",
  },
  {
    question: "Who is Queueup for?",
    answer:
      "Any walk-in business that runs a line — barbershops, clinics, banks, government counters, restaurants, repair shops. Shop owners get a full account and dashboard; customers stay ephemeral.",
  },
  {
    question: "What do shop owners manage day to day?",
    answer:
      "Today's live queue: see who's waiting, call the next customer, and mark tickets done or no-show. You also set shop details like name, category, location, and average service time.",
  },
  {
    question: "Will customers get notified when it's almost their turn?",
    answer:
      "Yes. They can watch token, position, and ETA on a live status page, and get an email when they're a couple of people away so they can arrive at the right time.",
  },
  {
    question: "Is this only for one location?",
    answer:
      "Queueup is built as a multi-tenant platform for local shops. Each shop gets its own queue, QR, and dashboard — start with one counter and grow from there.",
  },
];

export function Faq() {
  return (
    <section id="faq" className="border-b border-hairline bg-canvas">
      <div className="mx-auto max-w-[1280px] px-6 py-20 lg:px-8 lg:py-28">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.2fr)] lg:gap-16">
          <div className="max-w-md">
            <h2 className="text-[28px] font-medium leading-[1.2] tracking-[-0.42px] text-ink sm:text-[36px] sm:leading-[1.15] sm:tracking-[-0.72px]">
              Questions, answered.
            </h2>
            <p className="mt-5 text-base leading-relaxed text-ink-mute sm:text-lg sm:leading-[1.55]">
              How joining works, how the live line updates, and what shop owners
              actually do each day.
            </p>
          </div>

          <Accordion className="rounded-none border border-hairline bg-canvas px-5 sm:px-6">
            {faqs.map((faq) => (
              <AccordionItem
                key={faq.question}
                value={faq.question}
                className="border-hairline"
              >
                <AccordionTrigger className="py-5 text-[15px] font-medium text-ink hover:no-underline sm:text-base">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="pb-5 text-[15px] leading-relaxed text-ink-mute">
                  <p>{faq.answer}</p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}

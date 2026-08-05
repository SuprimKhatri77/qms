import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Cta() {
  return (
    <section className="border-b border-hairline bg-canvas">
      <div className="mx-auto max-w-[1280px] px-6 py-20 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-[28px] font-medium leading-[1.2] tracking-[-0.42px] text-ink sm:text-[36px] sm:leading-[1.15] sm:tracking-[-0.72px]">
            Ready to clear the waiting room?
          </h2>
          <p className="mt-4 text-base leading-relaxed text-ink-mute sm:text-lg">
            Set up your shop in minutes. Customers join with a QR scan — you
            manage the live line from one place.
          </p>
          <div className="mt-8 flex justify-center">
            <Button
              size="lg"
              nativeButton={false}
              render={<Link href="/auth/signup" />}
            >
              Create your shop account
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

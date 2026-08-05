import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="flex min-h-screen flex-col justify-center overflow-hidden border-b border-hairline">
      <div className="mx-auto w-full max-w-[1280px] px-6 py-20 lg:px-8 lg:py-28">
        <div className="flex max-w-[560px] flex-col gap-8 text-left sm:gap-10 lg:gap-12">
          <h1 className="animate-in fade-in slide-in-from-bottom-2 fill-mode-both text-[48px] font-medium leading-[1.05] tracking-[-1.44px] text-ink duration-500 sm:text-[56px] sm:tracking-[-1.68px] lg:text-[64px] lg:tracking-[-1.92px]">
            Queue<span className="text-primary">up</span>
          </h1>

          <p className="animate-in fade-in slide-in-from-bottom-3 fill-mode-both text-[22px] font-medium leading-[1.3] tracking-tight text-ink delay-75 duration-500 sm:text-[28px] sm:tracking-[-0.42px]">
            Take a number. Come back when it&apos;s yours.
          </p>

          <p className="max-w-[32rem] animate-in fade-in slide-in-from-bottom-3 fill-mode-both text-base leading-relaxed text-ink-mute delay-150 duration-500 sm:text-lg sm:leading-[1.55]">
            Scan a QR, join from anywhere, watch your spot tick down. Shops call
            the next person — everyone else gets a clearer wait.
          </p>

          <div className="flex animate-in fade-in slide-in-from-bottom-3 fill-mode-both flex-col gap-3 delay-200 duration-500 sm:flex-row">
            <Button
              size="lg"
              nativeButton={false}
              render={<Link href="/auth/signup" />}
            >
              Set up your shop
            </Button>
            <Button
              size="lg"
              variant="outline"
              nativeButton={false}
              render={<a href="#how-it-works" />}
            >
              How the queue works
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

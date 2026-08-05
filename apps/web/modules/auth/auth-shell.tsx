import Link from "next/link";

type AuthShellProps = {
  title: string;
  description: string;
  children: React.ReactNode;
  footer: React.ReactNode;
  /** Wider card + more padding — useful for longer forms like signup */
  roomy?: boolean;
};

export function AuthShell({
  title,
  description,
  children,
  footer,
  roomy = false,
}: AuthShellProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 sm:py-16 lg:px-8 lg:py-28 xl:py-32">
      <div className={roomy ? "w-full max-w-[440px]" : "w-full max-w-[400px]"}>
        <div className={roomy ? "mb-10 text-center" : "mb-8 text-center"}>
          <h1 className="text-[28px] font-medium leading-[1.2] tracking-[-0.42px] text-ink">
            {title}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-mute">
            {description}
          </p>
        </div>

        <div
          className={
            roomy
              ? "rounded-none border border-hairline bg-canvas p-8 shadow-[0_1px_3px_rgba(0,0,0,0.06)] sm:p-10"
              : "rounded-none border border-hairline bg-canvas p-8 shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
          }
        >
          {children}
        </div>

        <p className="mt-6 text-center text-sm text-ink-mute">{footer}</p>

        <p className="mt-4 text-center text-[13px] text-ink-mute">
          Customers never need an account.{" "}
          <Link
            href="/#how-it-works"
            className="underline underline-offset-4 hover:text-ink"
          >
            Learn how queues work
          </Link>
        </p>
      </div>
    </div>
  );
}

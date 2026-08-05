import Link from "next/link";
import { Logo } from "./logo";

const columns = [
  {
    title: "Product",
    links: [
      { href: "/#features", label: "Features" },
      { href: "/#how-it-works", label: "How it works" },
      { href: "/#faq", label: "FAQ" },
      { href: "/auth/signup", label: "Get started" },
    ],
  },
  {
    title: "For shops",
    links: [
      { href: "/auth/signup", label: "Create account" },
      { href: "/auth/login", label: "Sign in" },
      { href: "/#for-shops", label: "Owner dashboard" },
    ],
  },
  {
    title: "Customers",
    links: [
      { href: "/#how-it-works", label: "Join a queue" },
      { href: "/#features", label: "Track your spot" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-hairline bg-canvas">
      <div className="mx-auto max-w-[1280px] px-6 py-16 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-[13px] leading-relaxed text-ink-mute">
              Digital queue management for local businesses — less waiting,
              clearer turns.
            </p>
          </div>
          {columns.map((column) => (
            <div key={column.title}>
              <p className="text-[13px] font-medium text-ink">{column.title}</p>
              <ul className="mt-4 space-y-2">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-[13px] text-ink-mute transition-colors hover:text-ink"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 border-t border-hairline pt-6">
          <p className="text-[13px] text-ink-mute">
            © {new Date().getFullYear()} Queueup. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

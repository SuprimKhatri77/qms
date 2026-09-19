"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { LayoutDashboard, LogOut, Menu, X } from "lucide-react";
import type { User } from "@repo/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getInitials } from "@/lib/utils";
import { getHomePath } from "@/lib/home-path";
import { useLogout } from "@/modules/auth/hooks/mutations/useLogout";
import { Logo } from "./logo";

const navLinks = [
  { href: "/#features", label: "Features" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#faq", label: "FAQ" },
];

type LogoutMutation = ReturnType<typeof useLogout>;

// The dropdown behind the avatar, shown on desktop. `logout` is passed in
// (rather than each caller calling useLogout itself) so the desktop dropdown
// and the mobile menu's sign-out button share one mutation.
function UserMenu({ user, logout }: { user: User; logout: LogoutMutation }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            aria-label="Account menu"
            className="rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        }
      >
        <Avatar className="size-9">
          <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="font-normal">
            <span className="block truncate text-sm font-medium text-ink">
              {user.name}
            </span>
            <span className="block truncate text-xs text-ink-mute">
              {user.email}
            </span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href={getHomePath(user.role)} />}>
          <LayoutDashboard />
          Dashboard
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={logout.isPending}
          onClick={() => logout.mutate()}
        >
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Navbar({ initialUser }: { initialUser: User | null }) {
  const [open, setOpen] = useState(false);
  const logout = useLogout();

  return (
    <header className="sticky top-0 z-50 border-b border-hairline bg-canvas/95 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-[1280px] items-center justify-between px-6 lg:px-8">
        <Logo />

        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-ink-mute transition-colors hover:text-ink"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {initialUser ? (
            <UserMenu user={initialUser} logout={logout} />
          ) : (
            <>
              <Button
                variant="link"
                nativeButton={false}
                render={<Link href="/auth/login" />}
              >
                Sign in
              </Button>
              <Button
                nativeButton={false}
                render={<Link href="/auth/signup" />}
              >
                Get started
              </Button>
            </>
          )}
        </div>

        <button
          type="button"
          className="inline-flex size-9 items-center justify-center rounded-none text-ink md:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={open ? "close" : "open"}
              initial={{ opacity: 0, rotate: -90, scale: 0.8 }}
              animate={{ opacity: 1, rotate: 0, scale: 1 }}
              exit={{ opacity: 0, rotate: 90, scale: 0.8 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="inline-flex"
            >
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </motion.span>
          </AnimatePresence>
        </button>
      </div>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            key="mobile-nav"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-hairline bg-canvas md:hidden"
          >
            <motion.nav
              initial="closed"
              animate="open"
              exit="closed"
              variants={{
                open: {
                  transition: { staggerChildren: 0.045, delayChildren: 0.06 },
                },
                closed: {
                  transition: { staggerChildren: 0.03, staggerDirection: -1 },
                },
              }}
              className="flex flex-col gap-1 px-6 py-4"
            >
              {navLinks.map((link) => (
                <motion.div
                  key={link.href}
                  variants={{
                    open: { opacity: 1, y: 0 },
                    closed: { opacity: 0, y: -6 },
                  }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                >
                  <Link
                    href={link.href}
                    className="block py-2 text-sm font-medium text-ink"
                    onClick={() => setOpen(false)}
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}

              <motion.div
                variants={{
                  open: { opacity: 1, y: 0 },
                  closed: { opacity: 0, y: -6 },
                }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="mt-2 flex flex-col gap-2 border-t border-hairline pt-4"
              >
                {initialUser ? (
                  <>
                    <Button
                      variant="outline"
                      className="w-full"
                      nativeButton={false}
                      render={<Link href={getHomePath(initialUser.role)} />}
                      onClick={() => setOpen(false)}
                    >
                      Dashboard
                    </Button>
                    <Button
                      className="w-full"
                      disabled={logout.isPending}
                      onClick={() => {
                        setOpen(false);
                        logout.mutate();
                      }}
                    >
                      Sign out
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      className="w-full"
                      nativeButton={false}
                      render={<Link href="/auth/login" />}
                    >
                      Sign in
                    </Button>
                    <Button
                      className="w-full"
                      nativeButton={false}
                      render={<Link href="/auth/signup" />}
                    >
                      Get started
                    </Button>
                  </>
                )}
              </motion.div>
            </motion.nav>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}

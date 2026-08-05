"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "./password-input";

export function LoginForm() {
  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="login-email">Email</Label>
        <Input
          id="login-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@shop.com"
          required
          className="h-10 rounded-none border-hairline px-3 text-sm placeholder:text-ink-faint"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="login-password">Password</Label>
          <span className="text-xs text-ink-faint">Forgot password?</span>
        </div>
        <PasswordInput
          id="login-password"
          name="password"
          autoComplete="current-password"
          placeholder="••••••••"
          required
          className="h-10 rounded-none border-hairline px-3 text-sm placeholder:text-ink-faint"
        />
      </div>

      <Button type="submit" className="h-10 w-full">
        Sign in
      </Button>

      <p className="text-center text-xs text-ink-mute">
        Shop owner accounts only.{" "}
        <Link
          href="/auth/signup"
          className="underline underline-offset-4 hover:text-ink"
        >
          Create one
        </Link>
      </p>
    </form>
  );
}

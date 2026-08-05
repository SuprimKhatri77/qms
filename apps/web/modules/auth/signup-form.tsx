"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "./password-input";

export function SignupForm() {
  return (
    <form
      className="flex flex-col gap-7"
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const password = new FormData(form).get("password");
        const confirm = new FormData(form).get("confirmPassword");
        if (password !== confirm) {
          form
            .querySelector<HTMLInputElement>("#signup-confirm-password")
            ?.setCustomValidity("Passwords do not match");
          form.reportValidity();
          return;
        }
        form
          .querySelector<HTMLInputElement>("#signup-confirm-password")
          ?.setCustomValidity("");
      }}
    >
      <div className="flex flex-col gap-5">
        <div className="space-y-2.5">
          <Label htmlFor="signup-name" className="text-[13px] text-ink">
            Full name
          </Label>
          <Input
            id="signup-name"
            name="name"
            type="text"
            autoComplete="name"
            placeholder="Alex Rivera"
            required
            className="h-11 rounded-none border-hairline px-3.5 text-sm placeholder:text-ink-faint"
          />
        </div>

        <div className="space-y-2.5">
          <Label htmlFor="signup-email" className="text-[13px] text-ink">
            Work email
          </Label>
          <Input
            id="signup-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@shop.com"
            required
            className="h-11 rounded-none border-hairline px-3.5 text-sm placeholder:text-ink-faint"
          />
        </div>

        <div className="space-y-2.5">
          <Label htmlFor="signup-password" className="text-[13px] text-ink">
            Password
          </Label>
          <PasswordInput
            id="signup-password"
            name="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            minLength={8}
            required
            className="h-11 rounded-none border-hairline px-3.5 text-sm placeholder:text-ink-faint"
          />
        </div>

        <div className="space-y-2.5">
          <Label
            htmlFor="signup-confirm-password"
            className="text-[13px] text-ink"
          >
            Confirm password
          </Label>
          <PasswordInput
            id="signup-confirm-password"
            name="confirmPassword"
            autoComplete="new-password"
            placeholder="Re-enter your password"
            minLength={8}
            required
            onChange={(event) => {
              event.currentTarget.setCustomValidity("");
            }}
            className="h-11 rounded-none border-hairline px-3.5 text-sm placeholder:text-ink-faint"
          />
        </div>
      </div>

      <div className="flex flex-col gap-4 pt-1">
        <Button type="submit" className="h-11 w-full text-sm">
          Create shop account
        </Button>
        <p className="text-center text-[13px] leading-relaxed text-ink-mute">
          This account is for managing a shop queue. Customers join without
          signing up. You can add your shop details after signup.
        </p>
      </div>
    </form>
  );
}

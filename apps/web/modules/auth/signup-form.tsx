"use client";

import { useState } from "react";
import { AxiosError } from "axios";
import { useForm } from "@tanstack/react-form-nextjs";
import {
  ApiErrorResponse,
  SignupFormValues,
  SignupRequest,
  signupFormSchema,
} from "@repo/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { mapFieldErrors } from "@/lib/map-field-errors";
import { getRetryAfterSeconds } from "@/lib/rate-limit";
import { useRetryCountdown } from "@/hooks/use-retry-countdown";
import { RateLimitNotice } from "@/components/rate-limit-notice";
import { PasswordInput } from "./password-input";
import { useSignup } from "./hooks/mutations/useSignup";

export function SignupForm() {
  const [errors, setErrors] =
    useState<Partial<Record<keyof SignupFormValues, string>>>();
  const signup = useSignup();
  const retryCountdown = useRetryCountdown("rate-limit:signup");

  function clearFieldError(field: keyof SignupFormValues) {
    setErrors((prev) => {
      if (!prev?.[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  const form = useForm({
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
    validators: {
      onSubmit: signupFormSchema,
    },
    onSubmit: async ({ value }) => {
      setErrors(undefined);
      // confirmPassword only exists to check the two match in the form;
      // the API takes just these three fields.
      const payload: SignupRequest = {
        name: value.name,
        email: value.email,
        password: value.password,
      };
      try {
        await signup.mutateAsync(payload);
      } catch (err) {
        const error = err as AxiosError<ApiErrorResponse>;
        const data = error.response?.data;
        if (data?.errors?.length) {
          setErrors(mapFieldErrors(data.errors));
        }

        const retryAfter = getRetryAfterSeconds(error);
        if (retryAfter !== null) {
          retryCountdown.start(retryAfter, value.email);
        }
      }
    },
  });

  return (
    <form
      className="flex flex-col gap-7"
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
    >
      <div className="flex flex-col gap-5">
        <form.Field name="name">
          {(field) => {
            const fieldError = field.state.meta.errors[0]?.message;
            const mergedError = fieldError ?? errors?.name;
            const errorId = "signup-name-error";

            return (
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
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => {
                    clearFieldError("name");
                    field.handleChange(event.target.value);
                  }}
                  aria-invalid={mergedError ? true : undefined}
                  aria-describedby={mergedError ? errorId : undefined}
                  className="h-11 rounded-none border-hairline px-3.5 text-sm placeholder:text-ink-faint"
                />
                {mergedError ? (
                  <p id={errorId} role="alert" className="text-xs text-red-600">
                    {mergedError}
                  </p>
                ) : null}
              </div>
            );
          }}
        </form.Field>

        <form.Field name="email">
          {(field) => {
            const fieldError = field.state.meta.errors[0]?.message;
            const mergedError = fieldError ?? errors?.email;
            const errorId = "signup-email-error";

            return (
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
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => {
                    clearFieldError("email");
                    field.handleChange(event.target.value);
                  }}
                  aria-invalid={mergedError ? true : undefined}
                  aria-describedby={mergedError ? errorId : undefined}
                  className="h-11 rounded-none border-hairline px-3.5 text-sm placeholder:text-ink-faint"
                />
                {mergedError ? (
                  <p id={errorId} role="alert" className="text-xs text-red-600">
                    {mergedError}
                  </p>
                ) : null}
              </div>
            );
          }}
        </form.Field>

        <form.Field name="password">
          {(field) => {
            const fieldError = field.state.meta.errors[0]?.message;
            const mergedError = fieldError ?? errors?.password;
            const errorId = "signup-password-error";

            return (
              <div className="space-y-2.5">
                <Label
                  htmlFor="signup-password"
                  className="text-[13px] text-ink"
                >
                  Password
                </Label>
                <PasswordInput
                  id="signup-password"
                  name="password"
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  required
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => {
                    clearFieldError("password");
                    field.handleChange(event.target.value);
                  }}
                  aria-invalid={mergedError ? true : undefined}
                  aria-describedby={mergedError ? errorId : undefined}
                  className="h-11 rounded-none border-hairline px-3.5 text-sm placeholder:text-ink-faint"
                />
                {mergedError ? (
                  <p id={errorId} role="alert" className="text-xs text-red-600">
                    {mergedError}
                  </p>
                ) : null}
              </div>
            );
          }}
        </form.Field>

        <form.Field name="confirmPassword">
          {(field) => {
            const fieldError = field.state.meta.errors[0]?.message;
            const mergedError = fieldError ?? errors?.confirmPassword;
            const errorId = "signup-confirm-password-error";

            return (
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
                  required
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => {
                    clearFieldError("confirmPassword");
                    field.handleChange(event.target.value);
                  }}
                  aria-invalid={mergedError ? true : undefined}
                  aria-describedby={mergedError ? errorId : undefined}
                  className="h-11 rounded-none border-hairline px-3.5 text-sm placeholder:text-ink-faint"
                />
                {mergedError ? (
                  <p id={errorId} role="alert" className="text-xs text-red-600">
                    {mergedError}
                  </p>
                ) : null}
              </div>
            );
          }}
        </form.Field>
      </div>

      <div className="flex flex-col gap-4 pt-1">
        <form.Subscribe selector={(state) => state.values.email}>
          {(email) => {
            // Only while the form is on the email that was blocked: another
            // email may be allowed, so the server gets to decide.
            const secondsLeft = retryCountdown.secondsLeftFor(email);

            return (
              <>
                <RateLimitNotice secondsLeft={secondsLeft} />
                <Button
                  type="submit"
                  className="h-11 w-full text-sm"
                  disabled={signup.isPending || secondsLeft > 0}
                >
                  {signup.isPending ? (
                    <span className="inline-flex items-center gap-2">
                      <Spinner />
                      Creating account...
                    </span>
                  ) : (
                    "Create shop account"
                  )}
                </Button>
              </>
            );
          }}
        </form.Subscribe>
        <p className="text-center text-[13px] leading-relaxed text-ink-mute">
          This account is for managing a shop queue. Customers join without
          signing up. You can add your shop details after signup.
        </p>
      </div>
    </form>
  );
}

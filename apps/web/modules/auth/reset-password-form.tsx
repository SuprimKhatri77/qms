"use client";

import { useState } from "react";
import Link from "next/link";
import { AxiosError } from "axios";
import { useForm } from "@tanstack/react-form-nextjs";
import {
  ApiErrorResponse,
  ErrorCode,
  ResetPasswordFormValues,
  resetPasswordFormSchema,
} from "@repo/types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { mapFieldErrors } from "@/lib/map-field-errors";
import { getRetryAfterSeconds } from "@/lib/rate-limit";
import { useRetryCountdown } from "@/hooks/use-retry-countdown";
import { RateLimitNotice } from "@/components/rate-limit-notice";
import { PasswordInput } from "./password-input";
import { useResetPassword } from "./hooks/mutations/useResetPassword";

type PasswordField = "password" | "confirmPassword";

// The reset limit is counted per IP, not per link, so the countdown is
// keyed to this browser rather than to the token: a fresh link opened
// while blocked still shows the wait, and the token itself is never written
// to localStorage.
const RATE_LIMIT_SUBJECT = "this-browser";

// `token` comes from the emailed link's ?token=. null when the link was
// opened without one, which can only be a broken or hand-edited link.
export function ResetPasswordForm({ token }: { token: string | null }) {
  const [errors, setErrors] =
    useState<Partial<Record<keyof ResetPasswordFormValues, string>>>();
  const resetPassword = useResetPassword();
  const retryCountdown = useRetryCountdown("rate-limit:reset-password");

  function clearFieldError(field: PasswordField) {
    setErrors((prev) => {
      if (!prev?.[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  const form = useForm({
    defaultValues: {
      token: token ?? "",
      password: "",
      confirmPassword: "",
    },
    validators: { onSubmit: resetPasswordFormSchema },
    onSubmit: async ({ value }) => {
      setErrors(undefined);
      try {
        // confirmPassword only exists to check the two match in the form.
        await resetPassword.mutateAsync({
          token: value.token,
          password: value.password,
        });
      } catch (err) {
        const error = err as AxiosError<ApiErrorResponse>;
        const data = error.response?.data;
        if (data?.errors?.length) {
          setErrors(mapFieldErrors(data.errors));
        }

        const retryAfter = getRetryAfterSeconds(error);
        if (retryAfter !== null) {
          retryCountdown.start(retryAfter, RATE_LIMIT_SUBJECT);
        }
      }
    },
  });

  const tokenIsInvalid =
    !token ||
    resetPassword.error?.response?.data.code === ErrorCode.INVALID_TOKEN;

  if (tokenIsInvalid) {
    return (
      <div className="space-y-5 text-center">
        <p role="alert" className="text-sm leading-relaxed text-ink">
          This reset link is invalid or has expired. Links work once, for 15
          minutes.
        </p>
        <Button
          className="h-10 w-full"
          nativeButton={false}
          render={<Link href="/auth/forgot-password" />}
        >
          Send a new link
        </Button>
      </div>
    );
  }

  const secondsLeft = retryCountdown.secondsLeftFor(RATE_LIMIT_SUBJECT);

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
    >
      <form.Field name="password">
        {(field) => {
          const fieldError = field.state.meta.errors[0]?.message;
          const mergedError = fieldError ?? errors?.password;
          const errorId = "reset-password-error";

          return (
            <div className="space-y-2">
              <Label htmlFor="reset-password">New password</Label>
              <PasswordInput
                id="reset-password"
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
                className="h-10 rounded-none border-hairline px-3 text-sm placeholder:text-ink-faint"
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
          const errorId = "reset-confirm-password-error";

          return (
            <div className="space-y-2">
              <Label htmlFor="reset-confirm-password">
                Confirm new password
              </Label>
              <PasswordInput
                id="reset-confirm-password"
                name="confirmPassword"
                autoComplete="new-password"
                placeholder="Re-enter your new password"
                required
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => {
                  clearFieldError("confirmPassword");
                  field.handleChange(event.target.value);
                }}
                aria-invalid={mergedError ? true : undefined}
                aria-describedby={mergedError ? errorId : undefined}
                className="h-10 rounded-none border-hairline px-3 text-sm placeholder:text-ink-faint"
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

      <RateLimitNotice secondsLeft={secondsLeft} />
      <Button
        type="submit"
        className="h-10 w-full"
        // Stays disabled after success while the login page loads: a second
        // click would send the now-used token and flash "invalid link".
        disabled={
          resetPassword.isPending || resetPassword.isSuccess || secondsLeft > 0
        }
      >
        {resetPassword.isPending ? (
          <span className="inline-flex items-center gap-2">
            <Spinner />
            Saving...
          </span>
        ) : (
          "Set new password"
        )}
      </Button>
    </form>
  );
}

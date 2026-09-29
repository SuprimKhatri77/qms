"use client";

import { useState } from "react";
import Link from "next/link";
import { AxiosError } from "axios";
import { useForm } from "@tanstack/react-form-nextjs";
import {
  ApiErrorResponse,
  ForgotPasswordRequest,
  forgotPasswordSchema,
} from "@repo/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { mapFieldErrors } from "@/lib/map-field-errors";
import { getRetryAfterSeconds } from "@/lib/rate-limit";
import { useRetryCountdown } from "@/hooks/use-retry-countdown";
import { RateLimitNotice } from "@/components/rate-limit-notice";
import { useForgotPassword } from "./hooks/mutations/useForgotPassword";

export function ForgotPasswordForm() {
  const [errors, setErrors] =
    useState<Partial<Record<keyof ForgotPasswordRequest, string>>>();
  // The server's message, once a request went through. Shown instead of the
  // form, and worded the same whether or not the email has an account.
  const [sentMessage, setSentMessage] = useState<string | null>(null);
  const forgotPassword = useForgotPassword();
  const retryCountdown = useRetryCountdown("rate-limit:forgot-password");

  const form = useForm({
    defaultValues: { email: "" },
    validators: { onSubmit: forgotPasswordSchema },
    onSubmit: async ({ value }) => {
      setErrors(undefined);
      try {
        const result = await forgotPassword.mutateAsync(value);
        setSentMessage(result.message);
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

  if (sentMessage) {
    return (
      <div className="space-y-5 text-center">
        <p role="status" className="text-sm leading-relaxed text-ink">
          {sentMessage}
        </p>
        <p className="text-xs text-ink-mute">
          Nothing arrived? Check your spam folder, or{" "}
          <button
            type="button"
            className="underline underline-offset-4 hover:text-ink"
            onClick={() => setSentMessage(null)}
          >
            try another email
          </button>
          .
        </p>
      </div>
    );
  }

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
    >
      <form.Field name="email">
        {(field) => {
          const fieldError = field.state.meta.errors[0]?.message;
          const mergedError = fieldError ?? errors?.email;
          const errorId = "forgot-email-error";

          return (
            <div className="space-y-2">
              <Label htmlFor="forgot-email">Email</Label>
              <Input
                id="forgot-email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@shop.com"
                required
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => {
                  setErrors(undefined);
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

      <form.Subscribe selector={(state) => state.values.email}>
        {(email) => {
          const secondsLeft = retryCountdown.secondsLeftFor(email);

          return (
            <>
              <RateLimitNotice secondsLeft={secondsLeft} />
              <Button
                type="submit"
                className="h-10 w-full"
                disabled={forgotPassword.isPending || secondsLeft > 0}
              >
                {forgotPassword.isPending ? (
                  <span className="inline-flex items-center gap-2">
                    <Spinner />
                    Sending...
                  </span>
                ) : (
                  "Send reset link"
                )}
              </Button>
            </>
          );
        }}
      </form.Subscribe>

      <p className="text-center text-xs text-ink-mute">
        Remembered it?{" "}
        <Link
          href="/auth/login"
          className="underline underline-offset-4 hover:text-ink"
        >
          Back to sign in
        </Link>
      </p>
    </form>
  );
}

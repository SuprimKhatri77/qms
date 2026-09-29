"use client";

import { useForm } from "@tanstack/react-form-nextjs";
import { AxiosError } from "axios";
import {
  joinQueueSchema,
  type ApiErrorResponse,
  type JoinQueueRequest,
} from "@repo/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { useJoinQueue } from "./hooks/mutations/useJoinQueue";
import { getRetryAfterSeconds } from "@/lib/rate-limit";
import { useRetryCountdown } from "@/hooks/use-retry-countdown";
import { RateLimitNotice } from "@/components/rate-limit-notice";

const inputClassName =
  "h-10 rounded-none border-hairline px-3 text-sm placeholder:text-ink-faint";

type FieldShellProps = {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
};

function FieldShell({ id, label, error, children }: FieldShellProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}

const EMPTY_VALUES: JoinQueueRequest = { name: "", email: "", phone: "" };

export function JoinForm({ slug }: { slug: string }) {
  const joinQueue = useJoinQueue(slug);
  const retryCountdown = useRetryCountdown(`rate-limit:join:${slug}`);

  const form = useForm({
    defaultValues: EMPTY_VALUES,
    validators: { onSubmit: joinQueueSchema },
    onSubmit: async ({ value }) => {
      try {
        await joinQueue.mutateAsync(value);
      } catch (err) {
        // Other errors are already shown as a toast by useJoinQueue.
        const retryAfter = getRetryAfterSeconds(
          err as AxiosError<ApiErrorResponse>,
        );
        if (retryAfter !== null) {
          retryCountdown.start(retryAfter, value.email);
        }
      }
    },
  });

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
    >
      <form.Field name="name">
        {(field) => {
          const error = field.state.meta.errors[0]?.message;
          return (
            <FieldShell id="join-name" label="Your name" error={error}>
              <Input
                id="join-name"
                name="name"
                placeholder="Ram Bahadur"
                autoComplete="name"
                required
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? "join-name-error" : undefined}
                className={inputClassName}
              />
            </FieldShell>
          );
        }}
      </form.Field>

      <form.Field name="email">
        {(field) => {
          const error = field.state.meta.errors[0]?.message;
          return (
            <FieldShell id="join-email" label="Email" error={error}>
              <Input
                id="join-email"
                name="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                required
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? "join-email-error" : undefined}
                className={inputClassName}
              />
            </FieldShell>
          );
        }}
      </form.Field>

      <form.Field name="phone">
        {(field) => {
          const error = field.state.meta.errors[0]?.message;
          return (
            <FieldShell id="join-phone" label="Phone (optional)" error={error}>
              <Input
                id="join-phone"
                name="phone"
                type="tel"
                placeholder="98XXXXXXXX"
                autoComplete="tel"
                value={field.state.value ?? ""}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? "join-phone-error" : undefined}
                className={inputClassName}
              />
            </FieldShell>
          );
        }}
      </form.Field>

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
                className="h-10 w-full"
                disabled={joinQueue.isPending || secondsLeft > 0}
              >
                {joinQueue.isPending ? (
                  <span className="inline-flex items-center gap-2">
                    <Spinner />
                    Joining...
                  </span>
                ) : (
                  "Join the queue"
                )}
              </Button>
            </>
          );
        }}
      </form.Subscribe>

      <p className="text-center text-xs text-ink-mute">
        We&apos;ll email you a link to confirm your spot. No account, no app.
      </p>
      {/* Says plainly what the palo_device cookie is for, since it's set
          without asking (see apps/api/src/lib/device-token.ts). */}
      <p className="text-center text-xs text-ink-faint">
        Joining sets a one-day cookie so each phone can hold at most 2 places in
        this queue.
      </p>
    </form>
  );
}

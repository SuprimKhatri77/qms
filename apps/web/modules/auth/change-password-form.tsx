"use client";

import { useState } from "react";
import { AxiosError } from "axios";
import { useForm } from "@tanstack/react-form-nextjs";
import {
  ApiErrorResponse,
  ChangePasswordFormValues,
  changePasswordFormSchema,
} from "@repo/types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { mapFieldErrors } from "@/lib/map-field-errors";
import { getRetryAfterSeconds } from "@/lib/rate-limit";
import { useRetryCountdown } from "@/hooks/use-retry-countdown";
import { RateLimitNotice } from "@/components/rate-limit-notice";
import { PasswordInput } from "./password-input";
import { useChangePassword } from "./hooks/mutations/useChangePassword";

type FieldName = keyof ChangePasswordFormValues;

type ChangePasswordFormProps = {
  // Whose password this is. The id keys the rate-limit countdown (the limit
  // is counted per account), and the email fills the hidden username field
  // that password managers need to update the right saved login.
  user: { id: string; email: string };
};

// Used on the owner's Settings page and on the admin Account page.
export function ChangePasswordForm({ user }: ChangePasswordFormProps) {
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>();
  const changePassword = useChangePassword();
  const retryCountdown = useRetryCountdown("rate-limit:change-password");

  function clearFieldError(field: FieldName) {
    setErrors((prev) => {
      if (!prev?.[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  const form = useForm({
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    },
    validators: { onSubmit: changePasswordFormSchema },
    onSubmit: async ({ value }) => {
      setErrors(undefined);
      try {
        // confirmNewPassword only exists to check the two match in the form.
        await changePassword.mutateAsync({
          currentPassword: value.currentPassword,
          newPassword: value.newPassword,
        });
        // Empty the fields, so the passwords don't sit on screen afterwards.
        form.reset();
      } catch (err) {
        const error = err as AxiosError<ApiErrorResponse>;
        const data = error.response?.data;
        if (data?.errors?.length) {
          setErrors(mapFieldErrors(data.errors));
        }

        const retryAfter = getRetryAfterSeconds(error);
        if (retryAfter !== null) {
          retryCountdown.start(retryAfter, user.id);
        }
      }
    },
  });

  const secondsLeft = retryCountdown.secondsLeftFor(user.id);

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
    >
      <input
        type="email"
        name="username"
        autoComplete="username"
        value={user.email}
        readOnly
        hidden
      />

      <form.Field name="currentPassword">
        {(field) => (
          <PasswordField
            id="change-current-password"
            label="Current password"
            autoComplete="current-password"
            value={field.state.value}
            error={
              field.state.meta.errors[0]?.message ?? errors?.currentPassword
            }
            onBlur={field.handleBlur}
            onChange={(value) => {
              clearFieldError("currentPassword");
              field.handleChange(value);
            }}
          />
        )}
      </form.Field>

      <form.Field name="newPassword">
        {(field) => (
          <PasswordField
            id="change-new-password"
            label="New password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={field.state.value}
            error={field.state.meta.errors[0]?.message ?? errors?.newPassword}
            onBlur={field.handleBlur}
            onChange={(value) => {
              clearFieldError("newPassword");
              field.handleChange(value);
            }}
          />
        )}
      </form.Field>

      <form.Field name="confirmNewPassword">
        {(field) => (
          <PasswordField
            id="change-confirm-password"
            label="Confirm new password"
            autoComplete="new-password"
            placeholder="Re-enter your new password"
            value={field.state.value}
            error={
              field.state.meta.errors[0]?.message ?? errors?.confirmNewPassword
            }
            onBlur={field.handleBlur}
            onChange={(value) => {
              clearFieldError("confirmNewPassword");
              field.handleChange(value);
            }}
          />
        )}
      </form.Field>

      <p className="text-xs leading-relaxed text-ink-mute">
        Changing your password signs you out everywhere else. You stay signed in
        here.
      </p>

      <RateLimitNotice secondsLeft={secondsLeft} />
      <Button
        type="submit"
        className="h-10"
        disabled={changePassword.isPending || secondsLeft > 0}
      >
        {changePassword.isPending ? (
          <span className="inline-flex items-center gap-2">
            <Spinner />
            Saving...
          </span>
        ) : (
          "Change password"
        )}
      </Button>
    </form>
  );
}

type PasswordFieldProps = {
  id: string;
  label: string;
  autoComplete: "current-password" | "new-password";
  placeholder?: string;
  value: string;
  error: string | undefined;
  onBlur: () => void;
  onChange: (value: string) => void;
};

// One labelled password input with its error underneath. The three fields
// only differ in these props.
function PasswordField({
  id,
  label,
  autoComplete,
  placeholder,
  value,
  error,
  onBlur,
  onChange,
}: PasswordFieldProps) {
  const errorId = `${id}-error`;

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <PasswordInput
        id={id}
        autoComplete={autoComplete}
        placeholder={placeholder}
        required
        value={value}
        onBlur={onBlur}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className="h-10 rounded-none border-hairline px-3 text-sm placeholder:text-ink-faint"
      />
      {error ? (
        <p id={errorId} role="alert" className="text-xs text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}

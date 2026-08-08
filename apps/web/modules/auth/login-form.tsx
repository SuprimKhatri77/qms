"use client";

import { useState } from "react";
import Link from "next/link";
import { AxiosError } from "axios";
import { useForm } from "@tanstack/react-form-nextjs";
import { ApiErrorResponse, LoginRequest, loginSchema } from "@repo/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { mapFieldErrors } from "@/lib/map-field-errors";
import { PasswordInput } from "./password-input";
import { useLogin } from "./hooks/mutations/useLogin";

export function LoginForm() {
  const [errors, setErrors] =
    useState<Partial<Record<keyof LoginRequest, string>>>();
  const login = useLogin();

  function clearFieldError(field: keyof LoginRequest) {
    setErrors((prev) => {
      if (!prev?.[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    validators: {
      onSubmit: loginSchema,
    },
    onSubmit: async ({ value }) => {
      setErrors(undefined);
      try {
        await login.mutateAsync(value);
      } catch (err) {
        const error = err as AxiosError<ApiErrorResponse>;
        const data = error.response?.data;
        if (data?.errors?.length) {
          setErrors(mapFieldErrors(data.errors));
        }
      }
    },
  });

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
          const errorId = "login-email-error";

          return (
            <div className="space-y-2">
              <Label htmlFor="login-email">Email</Label>
              <Input
                id="login-email"
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

      <form.Field name="password">
        {(field) => {
          const fieldError = field.state.meta.errors[0]?.message;
          const mergedError = fieldError ?? errors?.password;
          const errorId = "login-password-error";

          return (
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

      <Button type="submit" className="h-10 w-full" disabled={login.isPending}>
        {login.isPending ? (
          <span className="inline-flex items-center gap-2">
            <Spinner />
            Signing in...
          </span>
        ) : (
          "Sign in"
        )}
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

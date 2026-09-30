import { z } from "zod";
import type { ApiSuccessResponse } from "../base";

export const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.email(),
  role: z.enum(["admin", "superadmin", "owner"]),
  imageUrl: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type User = z.infer<typeof userSchema>;

// Shared by signup, login and password reset so every way of setting a
// password agrees on the same bounds. The API passes the same numbers to
// Better Auth (lib/auth.ts), so its own routes can't set a password that
// this schema would then refuse at login.
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 50;

const emailSchema = z.email({ error: "Please enter a valid email address" });

const passwordSchema = z
  .string({ error: "Password is required" })
  .min(PASSWORD_MIN_LENGTH, {
    error: `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
  })
  .max(PASSWORD_MAX_LENGTH, {
    error: `Password must be at most ${PASSWORD_MAX_LENGTH} characters`,
  });

export const authSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = authSchema;

export type LoginRequest = z.infer<typeof loginSchema>;

export type LoginResponse = ApiSuccessResponse<{ user: User }>;

export const signupSchema = authSchema.extend({
  name: z
    .string({ error: "Name is required" })
    .trim()
    .min(1, { error: "Name is required" })
    .max(50, { error: "Name must be at most 50 characters" })
    .regex(/^[\p{L}]+(?:[ '\-][\p{L}]+)*$/u, {
      error: "Name can only contain letters, spaces, hyphens, and apostrophes",
    }),
});

export type SignupRequest = z.infer<typeof signupSchema>;

const confirmPasswordSchema = z
  .string({ error: "Please confirm your password" })
  .min(PASSWORD_MIN_LENGTH, {
    error: `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
  })
  .max(PASSWORD_MAX_LENGTH, {
    error: `Password must be at most ${PASSWORD_MAX_LENGTH} characters`,
  });

export const signupFormSchema = signupSchema
  .extend({ confirmPassword: confirmPasswordSchema })
  .refine((data) => data.password === data.confirmPassword, {
    error: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type SignupFormValues = z.infer<typeof signupFormSchema>;

export type SignupResponse = ApiSuccessResponse<{ user: User }>;

export type MeResponse = ApiSuccessResponse<{ user: User }>;

export type LogoutResponse = {
  success: true;
  message: string;
};

// Body of POST /auth/forgot-password.
export const forgotPasswordSchema = z.object({ email: emailSchema });

export type ForgotPasswordRequest = z.infer<typeof forgotPasswordSchema>;

// Same response whether or not the email has an account, so the endpoint
// can't be used to find out who is signed up.
export type ForgotPasswordResponse = {
  success: true;
  message: string;
};

// Body of POST /auth/reset-password. The token comes from the emailed link.
export const resetPasswordSchema = z.object({
  token: z
    .string({ error: "Reset link is missing its token" })
    .min(1, { error: "Reset link is missing its token" }),
  password: passwordSchema,
});

export type ResetPasswordRequest = z.infer<typeof resetPasswordSchema>;

export const resetPasswordFormSchema = resetPasswordSchema
  .extend({ confirmPassword: confirmPasswordSchema })
  .refine((data) => data.password === data.confirmPassword, {
    error: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type ResetPasswordFormValues = z.infer<typeof resetPasswordFormSchema>;

export type ResetPasswordResponse = {
  success: true;
  message: string;
};

// Body of POST /auth/change-password, for an owner or admin who is signed in
// and knows their current password. The current password only has to be
// non-empty here: whether it's right is Better Auth's check, and a rule like
// "at least 8 characters" would only give a confusing message for a typo.
const changePasswordFields = z.object({
  currentPassword: z
    .string({ error: "Enter your current password" })
    .min(1, { error: "Enter your current password" })
    .max(PASSWORD_MAX_LENGTH, {
      error: `Password must be at most ${PASSWORD_MAX_LENGTH} characters`,
    }),
  newPassword: passwordSchema,
});

// "Changing" to the same password would still sign every other device out
// and send a "your password was changed" email, for no reason.
function isDifferentFromCurrent(data: {
  currentPassword: string;
  newPassword: string;
}) {
  return data.newPassword !== data.currentPassword;
}

const differentFromCurrentMessage = {
  error: "Choose a password different from your current one",
  path: ["newPassword"],
};

export const changePasswordSchema = changePasswordFields.refine(
  isDifferentFromCurrent,
  differentFromCurrentMessage,
);

export type ChangePasswordRequest = z.infer<typeof changePasswordSchema>;

export const changePasswordFormSchema = changePasswordFields
  .extend({ confirmNewPassword: confirmPasswordSchema })
  .refine(isDifferentFromCurrent, differentFromCurrentMessage)
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    error: "Passwords do not match",
    path: ["confirmNewPassword"],
  });

export type ChangePasswordFormValues = z.infer<typeof changePasswordFormSchema>;

export type ChangePasswordResponse = {
  success: true;
  message: string;
};

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

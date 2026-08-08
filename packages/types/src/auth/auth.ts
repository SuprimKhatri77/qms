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

export const authSchema = z.object({
  email: z.email({ error: "Please enter a valid email address" }),
  password: z
    .string({ error: "Password is required" })
    .min(8, { error: "Password must be at least 8 characters" })
    .max(50, { error: "Password must be at most 50 characters" }),
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
    .regex(/^[A-Za-z]+(?: [A-Za-z]+)*$/, {
      error: "Name can only contain letters and spaces",
    }),
});

export type SignupRequest = z.infer<typeof signupSchema>;

export const signupFormSchema = signupSchema
  .extend({
    confirmPassword: z
      .string({ error: "Please confirm your password" })
      .min(8, { error: "Password must be at least 8 characters" })
      .max(50, { error: "Password must be at most 50 characters" }),
  })
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

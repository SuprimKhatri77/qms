import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { sendMail } from "@/lib/emails/send-email";

const trustedOrigins = ["http://localhost:5000", "http://localhost:3000"];
export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:5000",
  user: {
    modelName: "users",
  },
  trustedOrigins,
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    requireEmailVerification: false,
    resetPasswordTokenExpiresIn: 900,
    sendResetPassword: async ({ user, url, token }, request) => {
      const customForgotPasswordURL = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
      await sendMail({
        to: user.email,
        subject: "Reset your password",
        text: `Click the link to reset your password: ${customForgotPasswordURL}`,
        html: `<p>Click the link to reset your password:</p><a href="${customForgotPasswordURL}">${customForgotPasswordURL}</a>`,
      });
    },
  },
  emailVerification: {
    autoSignInAfterVerification: true,
    sendOnSignUp: true,
    expiresIn: 900,
    sendVerificationEmail: async ({ user, url, token }, request) => {
      const customVerificationURL = `${process.env.FRONTEND_URL}/verify/email?token=${token}`;
      await sendMail({
        to: user.email,
        subject: "Verify your email",
        text: `Click the link to verify your email: ${url}`,
        html: `<p>Click the link to verify your email:</p><a href="${customVerificationURL}">${customVerificationURL}</a>`,
      });
    },
  },

  advanced: {
    defaultCookieAttributes: {
      sameSite: "lax",
      httpOnly: true,
      path: "/",
    },
  },

  plugins: [admin()],
});

export type Session = Awaited<ReturnType<typeof auth.api.getSession>>;

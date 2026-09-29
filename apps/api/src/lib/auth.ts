import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins";
import { adminAc, defaultAc, userAc } from "better-auth/plugins/admin/access";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { sendMail } from "@/lib/emails/send-email";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@repo/types";

const superadminAc = defaultAc.newRole({
  user: [
    "create",
    "list",
    "set-role",
    "ban",
    "impersonate",
    "impersonate-admins",
    "delete",
    "set-password",
    "set-email",
    "get",
    "update",
  ],
  session: ["list", "revoke", "delete"],
});

const cookieDomain = process.env.COOKIE_DOMAIN; // e.g. ".example.com" for app + api subdomains
const isProd = process.env.NODE_ENV === "production";

const trustedOrigins = [
  "http://localhost:5000",
  "http://localhost:3000",
  process.env.BETTER_AUTH_URL,
  process.env.FRONTEND_URL,
].filter((origin): origin is string => Boolean(origin));

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
    // Same bounds as the zod schemas in @repo/types, so Better Auth's own
    // /api/auth/* routes can't set a password that /api/v1 login refuses.
    minPasswordLength: PASSWORD_MIN_LENGTH,
    maxPasswordLength: PASSWORD_MAX_LENGTH,
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
  // Owners aren't asked to verify their email: nothing in the app reads
  // emailVerified, and the password-reset email is what proves an owner
  // controls the address when it actually matters. So no email is sent on
  // signup (it used to be, with a link to a page that didn't exist).
  emailVerification: {
    sendOnSignUp: false,
  },

  advanced: {
    ...(cookieDomain
      ? {
          crossSubDomainCookies: {
            enabled: true,
            domain: cookieDomain,
          },
        }
      : {}),
    defaultCookieAttributes: {
      sameSite: "lax",
      httpOnly: true,
      path: "/",
      ...(isProd ? { secure: true } : {}),
    },
  },

  plugins: [
    admin({
      defaultRole: "owner",
      adminRoles: ["admin", "superadmin"],
      roles: {
        owner: userAc,
        admin: adminAc,
        superadmin: superadminAc,
      },
    }),
  ],
});

export type Session = Awaited<ReturnType<typeof auth.api.getSession>>;

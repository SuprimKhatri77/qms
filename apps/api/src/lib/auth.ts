import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins";
import { adminAc, defaultAc, userAc } from "better-auth/plugins/admin/access";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { and, eq, like } from "drizzle-orm";
import { sendMail } from "@/lib/emails/send-email";
import { logEvent } from "@/lib/system-logs/log-event";
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
    // Resetting the password logs out every existing session, so someone who
    // had got hold of the owner's session loses it along with the old password.
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, token }) => {
      // Our own page, not Better Auth's `url` (which points at the API): the
      // web app shows the form and posts the token to /api/v1/auth/reset-password.
      const resetUrl = `${process.env.FRONTEND_URL}/auth/reset-password?token=${encodeURIComponent(token)}`;

      // Not awaited, like the queue emails. Waiting on the mail server would
      // make a request for a real account slower than one for an unknown
      // email (which sends nothing), and a failed send would turn into an
      // error only real accounts can trigger. Either would reveal which
      // emails are signed up. A failure is logged for the admin instead.
      sendMail({
        to: user.email,
        subject: "Reset your Queueup password",
        text: `Someone asked to reset the password for this account. If it was you, open this link within 15 minutes: ${resetUrl}\n\nIf it wasn't you, ignore this email; your password hasn't changed.`,
        html: `<p>Someone asked to reset the password for this account. If it was you, open this link within 15 minutes:</p><p><a href="${resetUrl}">Reset my password</a></p><p>If it wasn't you, ignore this email; your password hasn't changed.</p>`,
      }).catch((error) => {
        console.error("sendResetPassword failed:", error);
        logEvent(
          "error",
          "password-reset-email",
          "Failed to send password reset email",
          {
            userId: user.id,
            error: String(error),
          },
        );
      });
    },
    // A reset link only dies when it's used, so asking twice leaves two
    // working links. Once the password has been reset with one, every other
    // outstanding link for the account is deleted too: an older email that
    // someone else gets hold of later can't reset the password again.
    // Better Auth runs this after saving the new password and before it
    // signs every session out; a failure here is logged but must not stop
    // that sign-out, and the leftover links still expire within 15 minutes.
    onPasswordReset: async ({ user }) => {
      try {
        await db
          .delete(schema.verification)
          .where(
            and(
              eq(schema.verification.value, user.id),
              like(schema.verification.identifier, "reset-password:%"),
            ),
          );
      } catch (error) {
        console.error("onPasswordReset failed:", error);
        logEvent(
          "error",
          "password-reset",
          "Couldn't delete the account's other reset links",
          { userId: user.id, error: String(error) },
        );
      }
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

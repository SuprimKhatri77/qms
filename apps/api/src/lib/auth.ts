import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins";
import { adminAc, defaultAc, userAc } from "better-auth/plugins/admin/access";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import {
  sendPasswordChangedEmail,
  sendResetPasswordEmail,
} from "@/lib/emails/password-emails";
import {
  RESET_IDENTIFIER_PREFIX,
  deleteResetLinks,
  hashResetIdentifier,
} from "@/lib/reset-links";
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
      sendResetPasswordEmail(user, token);
    },
    // Better Auth runs this after saving the new password and before it
    // signs every session out, for our reset route and its own raw one.
    //
    // A reset link only dies when it's used, so asking twice leaves two
    // working links: every other outstanding link for the account is
    // deleted too, so an older email someone else gets hold of later can't
    // reset the password again. A failure here is logged but must not stop
    // that sign-out, and the leftover links still expire within 15 minutes.
    onPasswordReset: async ({ user }) => {
      sendPasswordChangedEmail(user);

      try {
        await deleteResetLinks(user.id);
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
  // Reset tokens are stored hashed, so a copy of the database doesn't hold
  // working reset links (see hashResetIdentifier). Every other kind of
  // verification row keeps the default. Links emailed before this was
  // switched on still work: Better Auth falls back to a plain lookup, and
  // they expire within 15 minutes anyway.
  verification: {
    storeIdentifier: {
      default: "plain",
      overrides: {
        [RESET_IDENTIFIER_PREFIX]: { hash: hashResetIdentifier },
      },
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

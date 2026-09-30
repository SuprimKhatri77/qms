import { and, eq, like, or } from "drizzle-orm";
import { db } from "@/db";
import { verification } from "@/db/schema";
import {
  HASHED_RESET_IDENTIFIER_PREFIX,
  RESET_IDENTIFIER_PREFIX,
} from "./reset-link-identifier";

/**
 * Deletes every outstanding reset link for an account. Called once its
 * password has changed (by a reset or from the account page), so an older
 * reset email that someone else gets hold of can't change it again.
 *
 * Matches both forms: hashed rows, and plain rows emailed before hashing
 * was switched on (those expire within 15 minutes of the deploy).
 */
export async function deleteResetLinks(userId: string): Promise<void> {
  await db
    .delete(verification)
    .where(
      and(
        eq(verification.value, userId),
        or(
          like(verification.identifier, `${HASHED_RESET_IDENTIFIER_PREFIX}%`),
          like(verification.identifier, `${RESET_IDENTIFIER_PREFIX}%`),
        ),
      ),
    );
}

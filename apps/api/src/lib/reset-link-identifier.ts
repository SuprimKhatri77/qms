import { createHash } from "node:crypto";

// Kept apart from reset-links.ts (which talks to the database) so this pure
// logic can be unit-tested without one.

// Better Auth names each password-reset link "reset-password:<token>" and
// stores it as a row in `verification` whose value is the user's id. The
// token is the secret in the emailed link.
export const RESET_IDENTIFIER_PREFIX = "reset-password:";

// How a reset link is actually stored: the token's SHA-256 under a prefix
// of its own. It must NOT start with "reset-password:". When the hashed
// lookup finds nothing, Better Auth also tries the plain
// "reset-password:<submitted token>" (so links from before hashing still
// work). If stored rows kept that prefix, someone who read the database
// could submit a row's hash as the token and the plain lookup would match it.
export const HASHED_RESET_IDENTIFIER_PREFIX = "reset-password-hash:";

/**
 * How a reset link's identifier is stored (verification.storeIdentifier in
 * lib/auth.ts). Better Auth hashes the token from the link the same way
 * when it looks the row up, so the link still works, but someone who can
 * read the database can't turn a row back into a working link.
 *
 * A plain hash (no salt) is enough here: the token is 24 random characters,
 * so there's nothing to guess from its hash. A readable prefix is kept on
 * purpose, so deleteResetLinks can still find every link of one account;
 * Better Auth's own "hashed" option would hash the prefix away too.
 */
export async function hashResetIdentifier(identifier: string): Promise<string> {
  const token = identifier.slice(RESET_IDENTIFIER_PREFIX.length);
  const tokenHash = createHash("sha256").update(token).digest("hex");
  return `${HASHED_RESET_IDENTIFIER_PREFIX}${tokenHash}`;
}

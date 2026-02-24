import crypto from "crypto";

const API_KEY_PREFIX = "fc_";
const API_KEY_BYTE_LENGTH = 32;

/**
 * Generates a new API key with a recognizable prefix.
 * Returns the raw key (shown once to the user) and its SHA-256 hash (stored in DB).
 */
export function generateApiKey(): { rawKey: string; keyHash: string; keyPrefix: string } {
  const randomBytes = crypto.randomBytes(API_KEY_BYTE_LENGTH);
  const rawKey = `${API_KEY_PREFIX}${randomBytes.toString("base64url")}`;
  const keyHash = hashApiKey(rawKey);
  const keyPrefix = rawKey.slice(0, 12);

  return { rawKey, keyHash, keyPrefix };
}

/**
 * Hashes an API key using SHA-256.
 * Only the hash is stored in the database.
 */
export function hashApiKey(rawKey: string): string {
  return crypto.createHash("sha256").update(rawKey).digest("hex");
}

/**
 * Validates the format of an API key.
 */
export function isValidApiKeyFormat(key: string): boolean {
  return key.startsWith(API_KEY_PREFIX) && key.length > API_KEY_PREFIX.length + 10;
}

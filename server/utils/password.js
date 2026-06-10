import crypto from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(crypto.scrypt);
const KEY_LENGTH = 64;

export async function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const derivedKey = await scrypt(password, salt, KEY_LENGTH);
  return {
    salt,
    hash: derivedKey.toString("hex"),
  };
}

export async function verifyPassword(password, stored) {
  if (!stored?.salt || !stored?.hash) {
    return false;
  }

  const candidate = await hashPassword(password, stored.salt);
  const expected = Buffer.from(stored.hash, "hex");
  const actual = Buffer.from(candidate.hash, "hex");

  if (expected.length !== actual.length) {
    return false;
  }

  return crypto.timingSafeEqual(expected, actual);
}

import crypto from "node:crypto";
import { HttpError } from "./httpError.js";

function encode(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function decode(value) {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
}

function sign(data, secret) {
  return crypto.createHmac("sha256", secret).update(data).digest("base64url");
}

export function createSessionToken(user, config) {
  const header = encode({ alg: "HS256", typ: "JWT" });
  const nowSeconds = Math.floor(Date.now() / 1000);
  const payload = encode({
    sub: user.id,
    username: user.username,
    role: user.role,
    session_version: user.session_version || 0,
    iat: nowSeconds,
    exp: nowSeconds + config.auth.tokenTtlSeconds,
  });
  const unsigned = `${header}.${payload}`;
  return `${unsigned}.${sign(unsigned, config.auth.tokenSecret)}`;
}

export function verifySessionToken(token, config) {
  if (!token) {
    throw new HttpError(401, "Authentication required");
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new HttpError(401, "Invalid authentication token");
  }

  const [header, payload, signature] = parts;
  const unsigned = `${header}.${payload}`;
  const expected = sign(unsigned, config.auth.tokenSecret);
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(signature);

  if (
    expectedBuffer.length !== actualBuffer.length ||
    !crypto.timingSafeEqual(expectedBuffer, actualBuffer)
  ) {
    throw new HttpError(401, "Invalid authentication token");
  }

  const claims = decode(payload);
  if (!claims.exp || claims.exp < Math.floor(Date.now() / 1000)) {
    throw new HttpError(401, "Authentication token expired");
  }

  return claims;
}

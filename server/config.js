import fs from "node:fs";
import path from "node:path";

function loadEnvFile(filePath = path.resolve(process.cwd(), ".env")) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, equalsIndex).trim();
    let value = trimmed.slice(equalsIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function readNumber(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

loadEnvFile();

const nodeEnv = process.env.NODE_ENV || "development";
const localCouchDefaults = nodeEnv === "production"
  ? { username: "", password: "" }
  : { username: "admin", password: "password" };

export const config = {
  nodeEnv,
  port: readNumber("PORT", 5174),
  publicUrl: process.env.PUBLIC_URL || "http://localhost:5173",
  allowedOrigin: process.env.APP_ORIGIN || "http://localhost:5173",
  couchdb: {
    url: process.env.COUCHDB_URL || "http://127.0.0.1:5984",
    username: process.env.COUCHDB_USERNAME || localCouchDefaults.username,
    password: process.env.COUCHDB_PASSWORD || localCouchDefaults.password,
    dbPrefix: process.env.COUCHDB_DB_PREFIX || "devtrack",
  },
  auth: {
    tokenSecret:
      process.env.AUTH_TOKEN_SECRET ||
      (nodeEnv === "production" ? "" : "devtrack-local-secret-change-me"),
    tokenTtlSeconds: readNumber("AUTH_TOKEN_TTL_SECONDS", 7 * 24 * 60 * 60),
  },
  admin: {
    username: process.env.ADMIN_USERNAME || (nodeEnv === "production" ? "" : "admin"),
    password: process.env.ADMIN_PASSWORD || (nodeEnv === "production" ? "" : "password"),
    forcePasswordReset: process.env.ADMIN_FORCE_PASSWORD_RESET === "true",
  },
  deviceInfo: {
    providerUrl: process.env.DEVICE_INFO_API_URL || "",
    apiKey: process.env.DEVICE_INFO_API_KEY || "",
  },
};

if (!config.auth.tokenSecret) {
  throw new Error("AUTH_TOKEN_SECRET is required in production.");
}

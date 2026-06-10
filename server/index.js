import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "./config.js";
import { CouchDbClient } from "./couchdb/client.js";
import { EntityRepository, getEntitySchemas } from "./models/entityRepository.js";
import { UserRepository } from "./models/userRepository.js";
import { requireAdmin, requireAuth } from "./middleware/auth.js";
import { DeviceInfoService } from "./services/deviceInfoService.js";
import { createAuthRouter } from "./routes/auth.js";
import { createEntitiesRouter } from "./routes/entities.js";
import { createScannerRouter } from "./routes/scanner.js";
import { createUsersRouter } from "./routes/users.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const distPath = path.join(projectRoot, "dist");

const app = express();
const couch = new CouchDbClient(config.couchdb);
const users = new UserRepository(couch, config);
const entities = Object.keys(getEntitySchemas()).reduce((next, entityName) => {
  next[entityName] = new EntityRepository(couch, entityName);
  return next;
}, {});
const deviceInfo = new DeviceInfoService({
  deviceRepository: entities.Device,
  providerConfig: config.deviceInfo,
});

let ready = false;
let readyPromise = null;
let readyError = null;

async function initializeDatabase() {
  if (ready) {
    return;
  }
  if (readyPromise) {
    return readyPromise;
  }

  readyPromise = Promise.all([
    users.init(),
    ...Object.values(entities).map((repository) => repository.init()),
  ])
    .then(() => {
      ready = true;
      readyError = null;
      console.info("CouchDB databases and indexes are ready.");
    })
    .catch((error) => {
      ready = false;
      readyError = error;
      console.warn(`CouchDB is not ready: ${error.message}`);
      throw error;
    })
    .finally(() => {
      readyPromise = null;
    });

  return readyPromise;
}

async function requireDatabase(_req, res, next) {
  try {
    await initializeDatabase();
    next();
  } catch (error) {
    res.status(503).json({
      message: "CouchDB is not available",
      details: error.message,
    });
  }
}

app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));

app.use((req, res, next) => {
  const origin = req.get("Origin");
  if (origin && origin === config.allowedOrigin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});

app.get("/api/health", async (_req, res) => {
  try {
    await initializeDatabase();
    res.json({
      ok: true,
      couchdb: {
        ready,
        url: config.couchdb.url,
        dbPrefix: config.couchdb.dbPrefix,
      },
    });
  } catch (error) {
    res.status(503).json({
      ok: false,
      couchdb: {
        ready: false,
        url: config.couchdb.url,
        dbPrefix: config.couchdb.dbPrefix,
        error: readyError?.message || error.message,
        hint: "Start CouchDB and make sure COUCHDB_USERNAME/COUCHDB_PASSWORD match your CouchDB admin credentials.",
      },
    });
  }
});

app.get("/api/public-settings", (_req, res) => {
  res.json({
    id: "devtrack",
    public_settings: {
      auth_required: true,
      provider: "couchdb",
    },
  });
});

app.use("/api/auth", requireDatabase, createAuthRouter({ config, users }));
app.use(
  "/api/users",
  requireDatabase,
  requireAuth(config, users),
  requireAdmin(),
  createUsersRouter({ users }),
);
app.use(
  "/api/entities",
  requireDatabase,
  requireAuth(config, users),
  createEntitiesRouter(entities),
);
app.use(
  "/api/scanner",
  requireDatabase,
  requireAuth(config, users),
  createScannerRouter({ deviceInfo }),
);

if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) {
      next();
      return;
    }
    res.sendFile(path.join(distPath, "index.html"));
  });
}

app.use((req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.path}` });
});

app.use((error, _req, res, _next) => {
  const status = error.status || 500;
  if (status >= 500) {
    console.error(error);
  }

  res.status(status).json({
    message: error.message || "Internal server error",
    details: error.details,
  });
});

initializeDatabase().catch(() => {});

const server = app.listen(config.port, () => {
  console.info(`DevTrack API listening on http://127.0.0.1:${config.port}`);
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${config.port} is already in use. Stop the existing DevTrack API process or set PORT to a different value.`);
    console.error(`On macOS you can inspect it with: lsof -nP -iTCP:${config.port} -sTCP:LISTEN`);
    process.exit(1);
  }

  throw error;
});

function shutdown() {
  server.close(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

import { config } from "../config.js";
import { CouchDbClient } from "../couchdb/client.js";
import { EntityRepository, getEntitySchemas } from "../models/entityRepository.js";
import { UserRepository } from "../models/userRepository.js";
import { hashPassword } from "../utils/password.js";

const couch = new CouchDbClient(config.couchdb);
const users = new UserRepository(couch, config);
const entities = Object.keys(getEntitySchemas()).map((entityName) => new EntityRepository(couch, entityName));

function printConnectionSummary() {
  console.info("DevTrack local backend setup");
  console.info(`CouchDB URL: ${config.couchdb.url}`);
  console.info(`Database prefix: ${config.couchdb.dbPrefix}`);
  console.info(`API port: ${config.port}`);
  console.info(`App origin: ${config.allowedOrigin}`);
}

async function resetLocalAdminPassword() {
  const { username, password } = config.admin;
  if (!username || !password) {
    return;
  }

  const existing = await users.findDocByUsername(username);
  if (!existing) {
    return;
  }

  await couch.putDoc(users.dbName, {
    ...existing,
    password: await hashPassword(password),
    role: "admin",
    active: true,
    session_version: (Number.isInteger(existing.session_version) ? existing.session_version : 0) + 1,
    updated_at: new Date().toISOString(),
    updated_by: "setup:local",
  });

  console.info(`Local admin reset: ${username}`);
}

async function setup() {
  printConnectionSummary();
  console.info("Checking CouchDB connection...");
  await couch.ping();

  console.info("Creating/updating users database and seed admin...");
  await users.init();
  await resetLocalAdminPassword();

  console.info("Creating/updating entity databases and indexes...");
  for (const repository of entities) {
    await repository.init();
  }

  console.info("Ready for local testing.");
  console.info(`Login username: ${config.admin.username}`);
  console.info("Login password: configured in ADMIN_PASSWORD");
  console.info("Start the app with: npm run dev");
}

setup().catch((error) => {
  console.error("Local backend setup failed.");
  console.error(error.message);
  console.error("");
  console.error("Make sure CouchDB is running:");
  console.error("  npm run db:up");
  console.error("");
  console.error("Then retry:");
  console.error("  npm run setup:local");
  process.exitCode = 1;
});

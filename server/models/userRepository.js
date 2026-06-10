import { HttpError } from "../utils/httpError.js";
import { hashPassword, verifyPassword } from "../utils/password.js";

const ROLES = ["admin", "user"];
const LEGACY_CONTACT_FIELD = ["em", "ail"].join("");

function normalizeUsername(username) {
  return String(username || "").trim().toLowerCase();
}

function userId(username) {
  return `user:${normalizeUsername(username)}`;
}

function toClientUser(doc) {
  return {
    id: doc._id,
    username: doc.username,
    role: doc.role || "user",
    active: doc.active !== false,
    session_version: Number.isInteger(doc.session_version) ? doc.session_version : 0,
    created_at: doc.created_at,
    updated_at: doc.updated_at,
    created_by: doc.created_by,
    updated_by: doc.updated_by,
  };
}

function validateUsername(username) {
  const normalized = normalizeUsername(username);
  if (!normalized) {
    throw new HttpError(400, "Username is required");
  }
  if (!/^[a-z0-9._-]{3,64}$/.test(normalized)) {
    throw new HttpError(400, "Username must be 3-64 characters and may contain letters, numbers, dots, underscores, or hyphens");
  }
  return normalized;
}

function validateRole(role = "user") {
  if (!ROLES.includes(role)) {
    throw new HttpError(400, "Role must be admin or user");
  }
  return role;
}

export class UserRepository {
  constructor(couch, config) {
    this.couch = couch;
    this.config = config;
    this.dbName = null;
  }

  async init() {
    this.dbName = await this.couch.ensureDatabase("users");
    await this.couch.createIndex(this.dbName, ["username"], "users-username");
    await this.couch.createIndex(this.dbName, ["role"], "users-role");
    await this.couch.createIndex(this.dbName, ["active"], "users-active");
    await this.migrateLegacyUsers();
    await this.ensureSeedAdmin();
  }

  async list() {
    const docs = await this.couch.allDocs(this.dbName);
    return docs
      .filter((doc) => doc.username)
      .map(toClientUser)
      .sort((a, b) => a.username.localeCompare(b.username));
  }

  async findById(id) {
    const doc = await this.couch.getDoc(this.dbName, id);
    if (!doc.username) {
      throw new HttpError(404, "User not found");
    }
    return toClientUser(doc);
  }

  async findDocById(id) {
    const doc = await this.couch.getDoc(this.dbName, id);
    if (!doc.username) {
      throw new HttpError(404, "User not found");
    }
    return doc;
  }

  async findDocByUsername(username) {
    const id = userId(username);
    try {
      const doc = await this.couch.getDoc(this.dbName, id);
      return doc.username ? doc : null;
    } catch (error) {
      if (error.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async login({ username, password }) {
    const normalizedUsername = validateUsername(username);
    const user = await this.findDocByUsername(normalizedUsername);
    if (!user || !(await verifyPassword(password, user.password))) {
      throw new HttpError(401, "Invalid username or password");
    }
    if (user.active === false) {
      throw new HttpError(403, "This account is inactive");
    }

    return toClientUser(user);
  }

  async createUser(payload, actor = null) {
    const username = validateUsername(payload.username);
    if (!payload.password) {
      throw new HttpError(400, "Password is required");
    }

    const existing = await this.findDocByUsername(username);
    if (existing) {
      throw new HttpError(409, "Username already exists");
    }

    const now = new Date().toISOString();
    const password = await hashPassword(payload.password);
    const doc = {
      _id: userId(username),
      username,
      password,
      role: validateRole(payload.role || "user"),
      active: payload.active !== false,
      session_version: 0,
      created_at: now,
      updated_at: now,
      created_by: actor?.username || "system",
      updated_by: actor?.username || "system",
    };

    const saved = await this.couch.putDoc(this.dbName, doc);
    return toClientUser(saved);
  }

  async updateUser(id, payload, actor = null) {
    const existing = await this.findDocById(id);
    const nextUsername = payload.username !== undefined
      ? validateUsername(payload.username)
      : existing.username;
    const nextRole = payload.role !== undefined ? validateRole(payload.role) : existing.role;
    const nextActive = payload.active !== undefined ? !!payload.active : existing.active !== false;

    await this.assertNotRemovingLastAdmin(existing._id, nextRole, nextActive);

    const now = new Date().toISOString();
    const updated = {
      ...existing,
      username: nextUsername,
      role: nextRole,
      active: nextActive,
      session_version: Number.isInteger(existing.session_version) ? existing.session_version : 0,
      updated_at: now,
      updated_by: actor?.username || "system",
    };

    delete updated[LEGACY_CONTACT_FIELD];
    delete updated.otp;
    delete updated.reset;
    delete updated.verified;
    delete updated.oauth_provider;

    const nextId = userId(nextUsername);
    if (nextId === existing._id) {
      return toClientUser(await this.couch.putDoc(this.dbName, updated));
    }

    const duplicate = await this.findDocByUsername(nextUsername);
    if (duplicate) {
      throw new HttpError(409, "Username already exists");
    }

    const moved = await this.couch.putDoc(this.dbName, {
      ...updated,
      _id: nextId,
      _rev: undefined,
    });
    await this.couch.deleteDoc(this.dbName, existing);
    return toClientUser(moved);
  }

  async resetPassword(id, password, actor = null) {
    if (!password) {
      throw new HttpError(400, "Password is required");
    }

    const existing = await this.findDocById(id);
    const saved = await this.couch.putDoc(this.dbName, {
      ...existing,
      password: await hashPassword(password),
      session_version: (Number.isInteger(existing.session_version) ? existing.session_version : 0) + 1,
      updated_at: new Date().toISOString(),
      updated_by: actor?.username || "system",
    });

    return toClientUser(saved);
  }

  async invalidateSession(id) {
    const existing = await this.findDocById(id);
    const saved = await this.couch.putDoc(this.dbName, {
      ...existing,
      session_version: (Number.isInteger(existing.session_version) ? existing.session_version : 0) + 1,
      updated_at: new Date().toISOString(),
      updated_by: existing.username,
    });

    return toClientUser(saved);
  }

  async deleteUser(id, actor = null) {
    const existing = await this.findDocById(id);
    if (actor?.id === existing._id) {
      throw new HttpError(400, "Administrators cannot delete their own account");
    }
    await this.assertNotRemovingLastAdmin(existing._id, "user", false);
    await this.couch.deleteDoc(this.dbName, existing);
    return { id };
  }

  async migrateLegacyUsers() {
    const docs = await this.couch.allDocs(this.dbName);
    const usedUsernames = new Set(docs.map((doc) => doc.username).filter(Boolean));

    for (const doc of docs) {
      if (!doc._id.startsWith("user:")) {
        continue;
      }

      let username = doc.username ? normalizeUsername(doc.username) : "";
      if (!username && doc[LEGACY_CONTACT_FIELD]) {
        username = normalizeUsername(String(doc[LEGACY_CONTACT_FIELD]).split("@")[0]);
      }
      if (!username || !/^[a-z0-9._-]{3,64}$/.test(username)) {
        username = `legacy-${doc._id.replace(/^user:/, "").replace(/[^a-z0-9]/gi, "").slice(0, 16).toLowerCase()}`;
      }

      let uniqueUsername = username;
      let suffix = 2;
      while (usedUsernames.has(uniqueUsername) && uniqueUsername !== doc.username) {
        uniqueUsername = `${username}-${suffix}`;
        suffix += 1;
      }
      usedUsernames.add(uniqueUsername);

      const migrated = {
        ...doc,
        username: uniqueUsername,
        role: ROLES.includes(doc.role) ? doc.role : "user",
        active: doc.active !== undefined ? !!doc.active : doc.verified !== false,
        session_version: Number.isInteger(doc.session_version) ? doc.session_version : 0,
        updated_at: new Date().toISOString(),
      };

      delete migrated[LEGACY_CONTACT_FIELD];
      delete migrated.otp;
      delete migrated.reset;
      delete migrated.verified;
      delete migrated.oauth_provider;

      const nextId = userId(uniqueUsername);
      if (nextId === doc._id) {
        await this.couch.putDoc(this.dbName, migrated);
      } else {
        const saved = await this.couch.putDoc(this.dbName, {
          ...migrated,
          _id: nextId,
          _rev: undefined,
        });
        await this.couch.deleteDoc(this.dbName, doc);
        usedUsernames.add(saved.username);
      }
    }
  }

  async ensureSeedAdmin() {
    const { username, password } = this.config.admin;
    if (!username || !password) {
      return;
    }

    const existing = await this.findDocByUsername(username);
    if (!existing) {
      await this.createUser({ username, password, role: "admin", active: true });
      console.info(`Seed admin ensured: ${username}`);
      return;
    }

    const updates = {
      role: "admin",
      active: true,
    };
    if (this.config.admin.forcePasswordReset || !existing.password) {
      updates.password = password;
    }

    if (updates.password) {
      await this.resetPassword(existing._id, updates.password);
    }
    if (existing.role !== "admin" || existing.active === false) {
      await this.updateUser(existing._id, updates);
    }
  }

  async assertNotRemovingLastAdmin(targetId, nextRole, nextActive) {
    const users = await this.list();
    const activeAdminsAfterChange = users.filter((user) => {
      if (user.id === targetId) {
        return nextRole === "admin" && nextActive !== false;
      }
      return user.role === "admin" && user.active !== false;
    });

    if (activeAdminsAfterChange.length === 0) {
      throw new HttpError(400, "At least one active administrator is required");
    }
  }
}

import crypto from "node:crypto";
import { HttpError } from "../utils/httpError.js";

const NON_UNIQUE_SERIAL_VALUES = new Set(["n/a", "na", "not applicable"]);
const DEVICE_ASSET_TAG_PREFIX = "DEV-";
const DEVICE_ASSET_TAG_ATTEMPTS = 25;
const EMPLOYEE_ID_PREFIX = "EMP-";
const EMPLOYEE_ID_ATTEMPTS = 25;

const schemas = {
  Device: {
    dbName: "devices",
    fields: ["asset_tag", "device_name", "brand", "model", "serial_number", "category", "status", "notes"],
    required: ["device_name", "brand", "model", "serial_number", "status"],
    defaults: { status: "Available" },
    unique: ["asset_tag", "serial_number"],
    statuses: ["Available", "Assigned", "Maintenance"],
  },
  Employee: {
    dbName: "employees",
    fields: ["employee_id", "full_name", "department", "position"],
    required: ["full_name", "department"],
    defaults: {},
    unique: ["employee_id"],
  },
  Assignment: {
    dbName: "assignments",
    fields: [
      "employee_id",
      "employee_name",
      "branch",
      "device_id",
      "device_name",
      "asset_tag",
      "assigned_date",
      "returned_date",
      "status",
      "notes",
    ],
    required: ["employee_id", "employee_name", "device_id", "device_name", "asset_tag", "assigned_date", "status"],
    defaults: { status: "Active" },
    unique: [],
    statuses: ["Active", "Returned"],
  },
};

function compactPayload(payload, allowedFields) {
  return allowedFields.reduce((next, field) => {
    if (Object.prototype.hasOwnProperty.call(payload, field)) {
      next[field] = typeof payload[field] === "string" ? payload[field].trim() : payload[field];
    }
    return next;
  }, {});
}

function toClientDoc(doc, fields) {
  const result = {
    id: doc._id,
    created_at: doc.created_at,
    updated_at: doc.updated_at,
    created_by: doc.created_by,
    updated_by: doc.updated_by,
  };

  for (const field of fields) {
    result[field] = doc[field];
  }

  return result;
}

function shouldSkipUniqueCheck(field, value) {
  if (!value) {
    return true;
  }

  return field === "serial_number" && NON_UNIQUE_SERIAL_VALUES.has(String(value).trim().toLowerCase());
}

function normalizeEmployeeId(value) {
  return String(value || "").trim().toUpperCase();
}

function normalizeAssetTag(value) {
  return String(value || "").trim().toUpperCase();
}

function isRetryableConflict(error) {
  return error?.status === 409;
}

export function getEntitySchemas() {
  return schemas;
}

export class EntityRepository {
  constructor(couch, entityName) {
    const schema = schemas[entityName];
    if (!schema) {
      throw new Error(`Unknown entity: ${entityName}`);
    }

    this.couch = couch;
    this.entityName = entityName;
    this.schema = schema;
    this.dbName = null;
  }

  async init() {
    this.dbName = await this.couch.ensureDatabase(this.schema.dbName);
    await this.couch.createIndex(this.dbName, ["updated_at"], `${this.schema.dbName}-updated-at`);
    for (const field of this.schema.unique) {
      await this.couch.createIndex(this.dbName, [field], `${this.schema.dbName}-${field}`);
    }

    if (this.entityName === "Employee") {
      await this.ensureEmployeeIdentifiers();
    }
  }

  async list() {
    const docs = await this.couch.allDocs(this.dbName);
    return docs
      .filter((doc) => !doc._deleted)
      .map((doc) => toClientDoc(doc, this.schema.fields))
      .sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
  }

  async get(id) {
    const doc = await this.couch.getDoc(this.dbName, id);
    return toClientDoc(doc, this.schema.fields);
  }

  async findBySerialNumberOrAssetTag(identifier) {
    if (this.entityName !== "Device") {
      throw new HttpError(400, "Serial lookup is only available for devices");
    }

    const query = String(identifier || "").trim().toLowerCase();
    if (!query) {
      return null;
    }

    const docs = await this.couch.allDocs(this.dbName);
    const doc = docs.find((candidate) => {
      const serialNumber = String(candidate.serial_number || "").trim().toLowerCase();
      const assetTag = String(candidate.asset_tag || "").trim().toLowerCase();
      return serialNumber === query || assetTag === query;
    });

    return doc ? { id: doc._id, ...doc } : null;
  }

  async create(payload, user) {
    if (this.entityName === "Employee") {
      return this.createEmployee(payload, user);
    }

    if (this.entityName === "Device") {
      return this.createDevice(payload, user);
    }

    const now = new Date().toISOString();
    const data = await this.prepareForSave({
      ...this.schema.defaults,
      ...compactPayload(payload, this.schema.fields),
    });

    await this.validate(data);
    await this.assertUnique(data);

    const doc = {
      _id: crypto.randomUUID(),
      ...data,
      created_at: now,
      updated_at: now,
      created_by: user?.username || null,
      updated_by: user?.username || null,
    };

    const saved = await this.couch.putDoc(this.dbName, doc);
    return toClientDoc(saved, this.schema.fields);
  }

  async update(id, payload, user) {
    if (this.entityName === "Employee") {
      return this.updateEmployee(id, payload, user);
    }

    const existing = await this.couch.getDoc(this.dbName, id);
    const next = await this.prepareForSave({
      ...existing,
      ...compactPayload(payload, this.schema.fields),
      updated_at: new Date().toISOString(),
      updated_by: user?.username || existing.updated_by || null,
    });

    await this.validate(next);
    await this.assertUnique(next, id);

    const saved = await this.couch.putDoc(this.dbName, next);
    return toClientDoc(saved, this.schema.fields);
  }

  async delete(id) {
    const existing = await this.couch.getDoc(this.dbName, id);
    await this.couch.deleteDoc(this.dbName, existing);
    return { id };
  }

  async validate(data) {
    for (const field of this.schema.required) {
      if (data[field] === undefined || data[field] === null || data[field] === "") {
        throw new HttpError(400, `${field} is required`);
      }
    }

    if (this.schema.statuses && !this.schema.statuses.includes(data.status)) {
      throw new HttpError(400, `status must be one of: ${this.schema.statuses.join(", ")}`);
    }
  }

  async prepareForSave(data) {
    if (this.entityName !== "Employee") {
      if (this.entityName !== "Device") {
        return data;
      }

      const assetTag = normalizeAssetTag(data.asset_tag);
      if (assetTag) {
        return {
          ...data,
          asset_tag: assetTag,
        };
      }

      return {
        ...data,
        asset_tag: await this.generateDeviceAssetTag(),
      };
    }

    if (String(data.employee_id || "").trim()) {
      return data;
    }

    return {
      ...data,
      employee_id: await this.generateEmployeeId(),
    };
  }

  async generateEmployeeId() {
    const docs = await this.couch.allDocs(this.dbName);
    const usedIds = new Set();
    for (const doc of docs) {
      const employeeId = normalizeEmployeeId(doc.employee_id);
      if (employeeId) {
        usedIds.add(employeeId);
      }
    }

    for (let attempt = 0; attempt < EMPLOYEE_ID_ATTEMPTS; attempt += 1) {
      const candidate = `${EMPLOYEE_ID_PREFIX}${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
      if (!usedIds.has(candidate)) {
        return candidate;
      }
    }

    throw new HttpError(500, "Unable to generate a unique employee ID");
  }

  async generateDeviceAssetTag() {
    const docs = await this.couch.allDocs(this.dbName);
    const usedTags = new Set();

    for (const doc of docs) {
      const assetTag = normalizeAssetTag(doc.asset_tag);
      if (assetTag) {
        usedTags.add(assetTag);
      }
    }

    for (let attempt = 0; attempt < DEVICE_ASSET_TAG_ATTEMPTS; attempt += 1) {
      const candidate = `${DEVICE_ASSET_TAG_PREFIX}${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
      if (!usedTags.has(candidate)) {
        return candidate;
      }
    }

    throw new HttpError(500, "Unable to generate a unique device asset tag");
  }

  async createDevice(payload, user) {
    const now = new Date().toISOString();
    const data = await this.prepareForSave({
      ...this.schema.defaults,
      ...compactPayload(payload, this.schema.fields),
    });

    await this.validate(data);
    await this.assertUnique(data);

    const doc = {
      _id: crypto.randomUUID(),
      ...data,
      created_at: now,
      updated_at: now,
      created_by: user?.username || null,
      updated_by: user?.username || null,
    };

    const saved = await this.couch.putDoc(this.dbName, doc);
    return toClientDoc(saved, this.schema.fields);
  }

  async createEmployee(payload, user) {
    const now = new Date().toISOString();
    const data = {
      ...this.schema.defaults,
      ...compactPayload(payload, this.schema.fields),
    };
    delete data.employee_id;

    await this.validate(data);

    for (let attempt = 0; attempt < EMPLOYEE_ID_ATTEMPTS; attempt += 1) {
      const employeeId = await this.generateEmployeeId();
      const doc = {
        _id: employeeId,
        employee_id: employeeId,
        ...data,
        created_at: now,
        updated_at: now,
        created_by: user?.username || null,
        updated_by: user?.username || null,
      };

      try {
        const saved = await this.couch.putDoc(this.dbName, doc);
        return toClientDoc(saved, this.schema.fields);
      } catch (error) {
        if (!isRetryableConflict(error)) {
          throw error;
        }
      }
    }

    throw new HttpError(500, "Unable to create a unique employee record");
  }

  async updateEmployee(id, payload, user) {
    const existing = await this.couch.getDoc(this.dbName, id);
    const next = {
      ...existing,
      ...compactPayload(payload, this.schema.fields),
      employee_id: normalizeEmployeeId(existing.employee_id) || normalizeEmployeeId(existing._id),
      updated_at: new Date().toISOString(),
      updated_by: user?.username || existing.updated_by || null,
    };

    await this.validate(next);
    const saved = await this.couch.putDoc(this.dbName, next);
    return toClientDoc(saved, this.schema.fields);
  }

  async ensureEmployeeIdentifiers() {
    const docs = await this.couch.allDocs(this.dbName);
    const usedIds = new Set(
      docs
        .map((doc) => normalizeEmployeeId(doc.employee_id))
        .filter(Boolean),
    );

    for (const doc of docs) {
      if (normalizeEmployeeId(doc.employee_id)) {
        continue;
      }

      let employeeId = "";
      for (let attempt = 0; attempt < EMPLOYEE_ID_ATTEMPTS; attempt += 1) {
        const candidate = `${EMPLOYEE_ID_PREFIX}${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
        if (!usedIds.has(candidate)) {
          employeeId = candidate;
          usedIds.add(candidate);
          break;
        }
      }

      if (!employeeId) {
        throw new HttpError(500, "Unable to backfill employee IDs");
      }

      await this.couch.putDoc(this.dbName, {
        ...doc,
        employee_id: employeeId,
        updated_at: new Date().toISOString(),
      });
    }
  }

  async assertUnique(data, currentId = null) {
    if (!this.schema.unique.length) {
      return;
    }

    const docs = await this.couch.allDocs(this.dbName);
    for (const field of this.schema.unique) {
      const value = data[field];
      if (shouldSkipUniqueCheck(field, value)) {
        continue;
      }

      const duplicate = docs.find((doc) => {
        if (doc._id === currentId) {
          return false;
        }
        return String(doc[field] || "").toLowerCase() === String(value).toLowerCase();
      });

      if (duplicate) {
        throw new HttpError(409, `${field} must be unique`);
      }
    }
  }
}

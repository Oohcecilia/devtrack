import { HttpError } from "../utils/httpError.js";

export class CouchDbClient {
  constructor({ url, username, password, dbPrefix }) {
    this.baseUrl = url.replace(/\/$/, "");
    this.dbPrefix = dbPrefix;
    this.authHeader = username || password
      ? `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`
      : "";
  }

  getDbName(name) {
    return `${this.dbPrefix}_${name}`.toLowerCase().replace(/[^a-z0-9_$()+/-]/g, "_");
  }

  async request(path, options = {}) {
    const headers = new Headers(options.headers || {});
    if (this.authHeader) {
      headers.set("Authorization", this.authHeader);
    }
    if (options.body !== undefined && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });

    const contentType = response.headers.get("content-type") || "";
    const data = contentType.includes("application/json")
      ? await response.json()
      : await response.text();

    if (!response.ok) {
      const message = data?.reason || data?.error || data || "CouchDB request failed";
      throw new HttpError(response.status, message, data);
    }

    return data;
  }

  async ping() {
    return this.request("/");
  }

  async ensureDatabase(name) {
    const dbName = this.getDbName(name);
    try {
      await this.request(`/${encodeURIComponent(dbName)}`, { method: "PUT" });
    } catch (error) {
      if (error.status !== 412) {
        throw error;
      }
    }

    return dbName;
  }

  async createIndex(dbName, fields, name) {
    try {
      await this.request(`/${encodeURIComponent(dbName)}/_index`, {
        method: "POST",
        body: {
          index: { fields },
          name,
          type: "json",
        },
      });
    } catch (error) {
      if (error.status !== 400) {
        throw error;
      }
    }
  }

  async allDocs(dbName) {
    const result = await this.request(`/${encodeURIComponent(dbName)}/_all_docs?include_docs=true`);
    return result.rows
      .map((row) => row.doc)
      .filter((doc) => doc && !doc._id.startsWith("_design/"));
  }

  async getDoc(dbName, id) {
    try {
      return await this.request(`/${encodeURIComponent(dbName)}/${encodeURIComponent(id)}`);
    } catch (error) {
      if (error.status === 404) {
        throw new HttpError(404, "Record not found");
      }
      throw error;
    }
  }

  async putDoc(dbName, doc) {
    const result = await this.request(`/${encodeURIComponent(dbName)}/${encodeURIComponent(doc._id)}`, {
      method: "PUT",
      body: doc,
    });
    return {
      ...doc,
      _rev: result.rev,
    };
  }

  async deleteDoc(dbName, doc) {
    return this.request(
      `/${encodeURIComponent(dbName)}/${encodeURIComponent(doc._id)}?rev=${encodeURIComponent(doc._rev)}`,
      { method: "DELETE" },
    );
  }
}

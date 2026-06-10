const TOKEN_KEY = "devtrack_access_token";

function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function setStoredToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

async function request(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const token = getStoredToken();

  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(path, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const error = new Error(data?.message || data || "Request failed");
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

function entityClient(entityName) {
  const basePath = `/api/entities/${entityName}`;

  return {
    list: () => request(basePath),
    create: (data) => request(basePath, { method: "POST", body: data }),
    update: (id, data) => request(`${basePath}/${encodeURIComponent(id)}`, { method: "PATCH", body: data }),
    delete: (id) => request(`${basePath}/${encodeURIComponent(id)}`, { method: "DELETE" }),
  };
}

export const couchdb = {
  auth: {
    getToken: getStoredToken,
    setToken: setStoredToken,
    async login(username, password) {
      const result = await request("/api/auth/login", {
        method: "POST",
        body: { username, password },
      });
      setStoredToken(result.access_token);
      return result;
    },
    async me() {
      return request("/api/auth/me");
    },
    clearSession() {
      setStoredToken(null);
    },
    async logout() {
      try {
        if (getStoredToken()) {
          await request("/api/auth/logout", { method: "POST" });
        }
      } finally {
        setStoredToken(null);
      }
    },
    redirectToLogin() {
      window.location.href = "/login";
    },
  },
  users: {
    list: () => request("/api/users"),
    create: (data) => request("/api/users", { method: "POST", body: data }),
    update: (id, data) => request(`/api/users/${encodeURIComponent(id)}`, { method: "PATCH", body: data }),
    resetPassword: (id, password) => request(`/api/users/${encodeURIComponent(id)}/reset-password`, {
      method: "POST",
      body: { password },
    }),
    delete: (id) => request(`/api/users/${encodeURIComponent(id)}`, { method: "DELETE" }),
  },
  publicSettings: {
    get: () => request("/api/public-settings"),
  },
  scanner: {
    deviceInfo: (serialNumber) => request(`/api/scanner/device-info?serial_number=${encodeURIComponent(serialNumber)}`),
  },
  entities: {
    Device: entityClient("Device"),
    Employee: entityClient("Employee"),
    Assignment: entityClient("Assignment"),
  },
};

import { verifySessionToken } from "../utils/sessionToken.js";

export function requireAuth(config, users) {
  return async (req, _res, next) => {
    try {
      const header = req.get("Authorization") || "";
      const token = header.startsWith("Bearer ") ? header.slice(7) : "";
      const claims = verifySessionToken(token, config);
      req.user = await users.findById(claims.sub);
      const tokenSessionVersion = Number.isInteger(claims.session_version) ? claims.session_version : 0;
      if (tokenSessionVersion !== req.user.session_version) {
        const error = new Error("Authentication token expired");
        error.status = 401;
        throw error;
      }
      if (req.user.active === false) {
        const error = new Error("This account is inactive");
        error.status = 403;
        throw error;
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function requireAdmin() {
  return (req, _res, next) => {
    if (req.user?.role !== "admin") {
      const error = new Error("Administrator access required");
      error.status = 403;
      next(error);
      return;
    }

    next();
  };
}

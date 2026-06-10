import { Router } from "express";
import { asyncHandler } from "../utils/httpError.js";
import { createSessionToken } from "../utils/sessionToken.js";
import { requireAuth } from "../middleware/auth.js";

export function createAuthRouter({ config, users }) {
  const router = Router();

  router.post("/login", asyncHandler(async (req, res) => {
    const user = await users.login(req.body || {});
    res.json({
      access_token: createSessionToken(user, config),
      user,
    });
  }));

  router.get("/me", requireAuth(config, users), asyncHandler(async (req, res) => {
    res.json(req.user);
  }));

  router.post("/logout", requireAuth(config, users), asyncHandler(async (req, res) => {
    await users.invalidateSession(req.user.id);
    res.json({ ok: true });
  }));

  return router;
}

import { Router } from "express";
import { asyncHandler } from "../utils/httpError.js";

export function createUsersRouter({ users }) {
  const router = Router();

  router.get("/", asyncHandler(async (_req, res) => {
    res.json(await users.list());
  }));

  router.post("/", asyncHandler(async (req, res) => {
    const user = await users.createUser(req.body || {}, req.user);
    res.status(201).json(user);
  }));

  router.patch("/:id", asyncHandler(async (req, res) => {
    res.json(await users.updateUser(req.params.id, req.body || {}, req.user));
  }));

  router.post("/:id/reset-password", asyncHandler(async (req, res) => {
    res.json(await users.resetPassword(req.params.id, req.body?.password, req.user));
  }));

  router.delete("/:id", asyncHandler(async (req, res) => {
    res.json(await users.deleteUser(req.params.id, req.user));
  }));

  return router;
}

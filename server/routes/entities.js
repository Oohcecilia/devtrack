import { Router } from "express";
import { asyncHandler, HttpError } from "../utils/httpError.js";

export function createEntitiesRouter(repositories) {
  const router = Router();

  router.param("entityName", (req, _res, next, entityName) => {
    const repository = repositories[entityName];
    if (!repository) {
      next(new HttpError(404, "Unknown entity"));
      return;
    }

    req.repository = repository;
    next();
  });

  router.get("/:entityName", asyncHandler(async (req, res) => {
    res.json(await req.repository.list());
  }));

  router.post("/:entityName", asyncHandler(async (req, res) => {
    const created = await req.repository.create(req.body || {}, req.user);
    res.status(201).json(created);
  }));

  router.get("/:entityName/:id", asyncHandler(async (req, res) => {
    res.json(await req.repository.get(req.params.id));
  }));

  router.patch("/:entityName/:id", asyncHandler(async (req, res) => {
    res.json(await req.repository.update(req.params.id, req.body || {}, req.user));
  }));

  router.delete("/:entityName/:id", asyncHandler(async (req, res) => {
    res.json(await req.repository.delete(req.params.id));
  }));

  return router;
}

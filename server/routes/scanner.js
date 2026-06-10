import { Router } from "express";
import { asyncHandler } from "../utils/httpError.js";

export function createScannerRouter({ deviceInfo }) {
  const router = Router();

  router.get("/device-info", asyncHandler(async (req, res) => {
    // Step 1: Read the serial number collected by the scanner from a normalized query key.
    const serialNumber = req.query.serial_number || req.query.serialNumber || req.query.serial || req.query.code || "";

    // Step 2: Ask the device-info service to retrieve and normalize the device details.
    const result = await deviceInfo.lookupBySerialNumber(String(serialNumber));

    // Step 3: Return exactly one JSON object for the scanned serial, including graceful errors.
    res.status(result.status).json(result.body);
  }));

  return router;
}

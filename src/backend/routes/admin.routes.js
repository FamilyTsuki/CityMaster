import express from "express";
import { AdminController } from "../controllers/AdminController.js";
import { requireAdmin, requireCityEditor } from "../middleware/auth.js";

const router = express.Router();

router.get("/districts", requireCityEditor, AdminController.getDistricts);
router.post("/districts", requireCityEditor, AdminController.saveDistrict);
router.delete(
  "/districts/:cityKey/:id",
  requireCityEditor,
  AdminController.deleteDistrict,
);

router.get("/routes", requireCityEditor, AdminController.getRoutes);
router.post("/routes", requireCityEditor, AdminController.saveRoute);
router.delete(
  "/routes/:cityKey/:id",
  requireCityEditor,
  AdminController.deleteRoute,
);
router.get(
  "/routes/difficulties",
  requireCityEditor,
  AdminController.getRouteDifficulties,
);
router.post(
  "/routes/difficulty",
  requireCityEditor,
  AdminController.setRouteDifficulty,
);

router.get("/settings", requireAdmin, AdminController.getSettings);
router.post("/settings", requireAdmin, AdminController.saveSettings);

export default router;

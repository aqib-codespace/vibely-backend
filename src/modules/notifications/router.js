import express from "express";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "./controller.js";
import { isAuthenticated } from "../../middleware/auth.js";

const router = express.Router();

router.use(isAuthenticated);

router.get("/", getNotifications);
router.put("/:notificationId/read", markNotificationRead);
router.put("/read-all", markAllNotificationsRead);

export default router;

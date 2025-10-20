import { getUserNotifications, markAsRead, markAllAsRead } from "./services.js";
import apiError from "../../utils/apiError.js";

export const getNotifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const result = await getUserNotifications(
      req.userId,
      parseInt(page),
      parseInt(limit)
    );

    res.json({
      success: true,
      data: result.notifications,
      unreadCount: result.unreadCount,
    });
  } catch (error) {
    next(apiError.internal("Failed to fetch notifications"));
  }
};

export const markNotificationRead = async (req, res, next) => {
  try {
    const { notificationId } = req.params;
    await markAsRead(notificationId, req.userId);

    res.json({ success: true, message: "Notification marked as read" });
  } catch (error) {
    next(apiError.internal("Failed to mark notification as read"));
  }
};

export const markAllNotificationsRead = async (req, res, next) => {
  try {
    await markAllAsRead(req.userId);
    res.json({ success: true, message: "All notifications marked as read" });
  } catch (error) {
    next(apiError.internal("Failed to mark notifications as read"));
  }
};

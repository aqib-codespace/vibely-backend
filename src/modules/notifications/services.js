import { Notification } from "./model.js";
import { getIO } from "../../utils/socket.io.js";
import { NOTIFICATION_STATUS } from "../../constants/notification-enums.js";

export const createNotification = async ({
  recipient,
  sender,
  type,
  message,
  relatedId = null,
}) => {
  try {
    const doc = {
      recipient,
      type,
      message,
      relatedId,
    };

    if (sender) {
      doc.sender = sender;
    } else {
      // system notification
      doc.senderName = "Vibely";
      doc.senderProfilePicture = "";
    }

    const notification = await Notification.create(doc);

    // populate sender only when it exists
    if (notification.sender) {
      await notification.populate("sender", "firstName lastName profilePicture");
    }

    const io = getIO();
    io.to(recipient.toString()).emit("new_notification", notification);

    return notification;
  } catch (error) {
    console.error("Error creating notification:", error);
    throw error;
  }
};

export const getUserNotifications = async (userId, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;

  const notifications = await Notification.find({ recipient: userId })
    .populate("sender", "firstName lastName profilePicture")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const unreadCount = await Notification.countDocuments({
    recipient: userId,
    status: NOTIFICATION_STATUS.UNREAD,
  });

  return { notifications, unreadCount };
};

export const markAsRead = async (notificationId, userId) => {
  return await Notification.findOneAndUpdate(
    { _id: notificationId, recipient: userId },
    { status: NOTIFICATION_STATUS.READ, readAt: new Date() },
    { new: true }
  );
};

export const markAllAsRead = async (userId) => {
  return await Notification.updateMany(
    { recipient: userId, status: NOTIFICATION_STATUS.UNREAD },
    { status: NOTIFICATION_STATUS.READ, readAt: new Date() }
  );
};

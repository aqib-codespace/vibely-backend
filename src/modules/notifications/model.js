import mongoose from "mongoose";
import {
  NOTIFICATION_TYPE,
  NOTIFICATION_STATUS,
} from "../../constants/notification-enums.js";

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    // For system notifications or when sender is not a user, store name and profile picture
    senderName: {
      type: String,
      default: "Vibely",
    },
    senderProfilePicture: {
      type: String,
      default: "",
    },
    type: {
      type: String,
      enum: Object.values(NOTIFICATION_TYPE),
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(NOTIFICATION_STATUS),
      default: NOTIFICATION_STATUS.UNREAD,
    },
    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    readAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, status: 1, createdAt: -1 });

export const Notification = mongoose.model("Notification", notificationSchema);
export default Notification;

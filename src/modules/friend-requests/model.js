import mongoose from "mongoose";
import { FRIEND_REQUEST_STATUS } from "../../constants/enums.js";

const friendRequestSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(FRIEND_REQUEST_STATUS),
      default: FRIEND_REQUEST_STATUS.Pending,
    },
  },
  { timestamps: true }
);
export const FriendRequests = mongoose.model(
  "FriendRequests",
  friendRequestSchema
);
export default FriendRequests;

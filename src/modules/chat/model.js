import mongoose from "mongoose";
import { MESSAGE_REACTIONS, WALLPAPER_TYPE } from "../../constants/enums.js";

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    chat: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
      required: true,
    },
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    },
    productRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MarketPlace",
    },
    productData: {
      type: mongoose.Schema.Types.Mixed,
      required: false,
    },
    reaction: [
      {
        emoji: {
          type: String,
          enum: Object.values(MESSAGE_REACTIONS),
        },
        users: [
          { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        ],
      },
    ],
    deletedFor: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    readBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    media: {
      url: String,
      public_id: String,
      type: { type: String, enum: ["image", "video"] },
    },
  },
  { timestamps: true }
);

const chatSchema = new mongoose.Schema(
  {
    chatName: {
      type: String,
      trim: true,
    },
    isGroupChat: {
      type: Boolean,
      default: false,
    },
    users: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    latestMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    },
    groupAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    wallpaper: {
      type: {
        type: String,
        enum: Object.values(WALLPAPER_TYPE),
      },
      value: { type: String },
      public_id: { type: String },
    },
  },
  { timestamps: true }
);

export const Chat = mongoose.model("Chat", chatSchema);
export const Message = mongoose.model("Message", messageSchema);
export default { Chat, Message };

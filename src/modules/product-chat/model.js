import mongoose from "mongoose";
import {
  MESSAGE_REACTIONS,
  PRODUCT_CHAT_ROLES,
  PRODUCT_CHAT_STATUS,
} from "../../constants/enums.js";

// Simple Product Chat Schema
const productChatSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MarketPlace",
      required: true,
      index: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(PRODUCT_CHAT_STATUS),
      default: PRODUCT_CHAT_STATUS.Active,
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    // Product info snapshot
    productSnapshot: {
      name: String,
      price: Number,
      image: String,
    },
  },
  {
    timestamps: true,
    // Ensure one chat per product-user combination
    indexes: [{ productId: 1, user: 1 }],
  }
);

// Simple Product Message Schema
const productMessageSchema = new mongoose.Schema(
  {
    productChatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductChat",
      required: true,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    senderRole: {
      type: String,
      enum: Object.values(PRODUCT_CHAT_ROLES),
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    media: {
      url: String,
      public_id: String,
      type: { type: String, enum: ["image", "video"] },
    },
    readBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    reactions: [
      {
        emoji: {
          type: String,
          enum: Object.values(MESSAGE_REACTIONS),
        },
        users: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      },
    ],
  },
  {
    timestamps: true,
    indexes: [{ productChatId: 1, createdAt: -1 }],
  }
);

// Compound unique index to prevent duplicate chats
productChatSchema.index({ productId: 1, user: 1 }, { unique: true });

export const ProductChat = mongoose.model("ProductChat", productChatSchema);
export const ProductMessage = mongoose.model(
  "ProductMessage",
  productMessageSchema
);

export default { ProductChat, ProductMessage };

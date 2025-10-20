import mongoose from "mongoose";
import {
  MESSAGE_REACTIONS,
  MARKETPLACE_CHAT_TYPE,
} from "../../constants/enums.js";

const marketplaceChatSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],

    productRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MarketPlace",
      required: true,
    },
    chatType: {
      type: String,
      enum: Object.values(MARKETPLACE_CHAT_TYPE),
      default: MARKETPLACE_CHAT_TYPE.PRODUCT_INQUIRY,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MarketplaceMessage",
    },

    blockedBy: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        blockedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    archivedBy: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        archivedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    settings: {
      allowMediaSharing: {
        type: Boolean,
        default: true,
      },
      enableNotifications: {
        type: Boolean,
        default: true,
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

const marketplaceMessageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    chat: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MarketplaceChat",
      required: true,
    },

    content: {
      type: String,
      required: true,
      trim: true,
      maxLength: 2000,
    },

    messageType: {
      type: String,
      enum: ["text", "image", "product_share", "offer", "system"],
      default: "text",
    },

    media: [
      {
        url: { type: String, required: true },
        public_id: { type: String, required: true },
        type: { type: String, enum: ["image", "video"], required: true },
        caption: { type: String },
      },
    ],

    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MarketplaceMessage",
    },

    sharedProduct: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MarketPlace",
    },

    offerDetails: {
      amount: { type: Number },
      currency: { type: String, default: "USD" },
      expiresAt: { type: Date },
      status: {
        type: String,
        enum: ["pending", "accepted", "rejected", "expired"],
        default: "pending",
      },
    },

    reactions: [
      {
        emoji: {
          type: String,
          enum: Object.values(MESSAGE_REACTIONS),
        },
        users: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
          },
        ],
      },
    ],

    readBy: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        readAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    deletedFor: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        deletedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    editHistory: [
      {
        content: String,
        editedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    isEdited: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

marketplaceChatSchema.index({ participants: 1, productRef: 1 });
marketplaceChatSchema.index({ productRef: 1, updatedAt: -1 });
marketplaceChatSchema.index({ participants: 1, updatedAt: -1 });

marketplaceMessageSchema.index({ chat: 1, createdAt: -1 });
marketplaceMessageSchema.index({ sender: 1, createdAt: -1 });

marketplaceChatSchema.virtual("unreadCount").get(function () {
  return 0;
});

marketplaceMessageSchema.virtual("isDeleted").get(function () {
  return this.deletedFor && this.deletedFor.length > 0;
});

marketplaceChatSchema.pre("save", function (next) {
  if (this.isModified("lastMessage")) {
    this.updatedAt = Date.now();
  }
  next();
});

marketplaceChatSchema.methods.addParticipant = function (userId) {
  if (!this.participants.includes(userId)) {
    this.participants.push(userId);
    return this.save();
  }
  return this;
};

marketplaceChatSchema.methods.removeParticipant = function (userId) {
  this.participants = this.participants.filter(
    (participant) => !participant.equals(userId)
  );
  return this.save();
};

marketplaceChatSchema.methods.isBlocked = function (userId) {
  return this.blockedBy.some((block) => block.userId.equals(userId));
};

marketplaceChatSchema.methods.blockUser = function (userId) {
  if (!this.isBlocked(userId)) {
    this.blockedBy.push({ userId, blockedAt: new Date() });
    return this.save();
  }
  return this;
};

marketplaceChatSchema.methods.unblockUser = function (userId) {
  this.blockedBy = this.blockedBy.filter(
    (block) => !block.userId.equals(userId)
  );
  return this.save();
};

export const MarketplaceChat = mongoose.model(
  "MarketplaceChat",
  marketplaceChatSchema
);
export const MarketplaceMessage = mongoose.model(
  "MarketplaceMessage",
  marketplaceMessageSchema
);

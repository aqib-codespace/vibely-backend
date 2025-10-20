import { ProductChat, ProductMessage } from "./model.js";
import { MarketPlace } from "../market-place/model.js";
import {
  PRODUCT_CHAT_ROLES,
  PRODUCT_CHAT_STATUS,
} from "../../constants/enums.js";
import { createNotification } from "../notifications/services.js";
import { NOTIFICATION_TYPE } from "../../constants/notification-enums.js";
import { User } from "../users/model.js";

/**
 * Create or get existing product chat
 */
export const createOrGetProductChat = async (productId, userId) => {
  try {
    // Get product and validate
    const product = await MarketPlace.findById(productId).populate("userId");
    if (!product) {
      throw new Error("Product not found");
    }

    const ownerId = product.userId._id;

    // Prevent owner from chatting with themselves
    if (ownerId.toString() === userId.toString()) {
      throw new Error("Cannot chat about your own product");
    }

    // Check if chat already exists
    let chat = await ProductChat.findOne({
      productId,
      user: userId,
    }).populate([
      { path: "owner", select: "firstName lastName userName profilePicture" },
      { path: "user", select: "firstName lastName userName profilePicture" },
      { path: "productId", select: "name price images" },
    ]);

    if (chat) {
      // Reactivate if closed
      if (chat.status === PRODUCT_CHAT_STATUS.Closed) {
        chat.status = PRODUCT_CHAT_STATUS.Active;
        await chat.save();
      }
      return chat;
    }

    // Create new chat
    const newChat = await ProductChat.create({
      productId,
      owner: ownerId,
      user: userId,
      productSnapshot: {
        name: product.name,
        price: product.price,
        image: product.images[0]?.url || null,
      },
    });

    // Send notification to product owner about new inquiry
    try {
      const inquirer = await User.findById(userId, "firstName lastName");
      if (inquirer) {
        await createNotification({
          recipient: ownerId,
          sender: userId,
          type: NOTIFICATION_TYPE.NEW_MESSAGE,
          message: `${inquirer.firstName} ${inquirer.lastName} is interested in your product "${product.name}"`,
          relatedId: productId,
        });
      }
    } catch (error) {
      console.error("Failed to create product inquiry notification:", error);
    }

    // Return populated chat
    return await ProductChat.findById(newChat._id).populate([
      { path: "owner", select: "firstName lastName userName profilePicture" },
      { path: "user", select: "firstName lastName userName profilePicture" },
      { path: "productId", select: "name price images" },
    ]);
  } catch (error) {
    throw error;
  }
};

/**
 * Get user's product chats
 */
export const getUserProductChats = async (userId) => {
  try {
    // Chats where user is the owner (selling)
    const ownerChats = await ProductChat.find({ owner: userId })
      .populate("user", "firstName lastName userName profilePicture")
      .populate("productId", "name price images")
      .sort({ lastMessageAt: -1 });

    // Chats where user is inquiring (buying)
    const userChats = await ProductChat.find({ user: userId })
      .populate("owner", "firstName lastName userName profilePicture")
      .populate("productId", "name price images")
      .sort({ lastMessageAt: -1 });

    return {
      selling: ownerChats, // Products I'm selling
      buying: userChats, // Products I'm interested in
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Send message in product chat
 */
export const sendProductMessage = async (
  chatId,
  senderId,
  content,
  media = null
) => {
  try {
    // Get chat and validate
    const chat = await ProductChat.findById(chatId);
    if (!chat) {
      throw new Error("Chat not found");
    }

    // Check if user is participant
    if (
      chat.owner.toString() !== senderId &&
      chat.user.toString() !== senderId
    ) {
      throw new Error("Not authorized to send message in this chat");
    }

    // Determine sender role
    const senderRole =
      chat.owner.toString() === senderId
        ? PRODUCT_CHAT_ROLES.Owner
        : PRODUCT_CHAT_ROLES.User;

    // Create message
    const message = await ProductMessage.create({
      productChatId: chatId,
      sender: senderId,
      senderRole,
      content,
      media,
      readBy: [senderId],
    });

    // Update chat last message time
    chat.lastMessageAt = new Date();
    chat.status = PRODUCT_CHAT_STATUS.Active;
    await chat.save();

    // Return populated message
    return await ProductMessage.findById(message._id).populate(
      "sender",
      "firstName lastName userName profilePicture"
    );
  } catch (error) {
    throw error;
  }
};

/**
 * Get messages for a product chat
 */
export const getProductChatMessages = async (
  chatId,
  userId,
  page = 1,
  limit = 50
) => {
  try {
    // Validate user is participant
    const chat = await ProductChat.findById(chatId);
    if (!chat) {
      throw new Error("Chat not found");
    }

    if (chat.owner.toString() !== userId && chat.user.toString() !== userId) {
      throw new Error("Not authorized to view this chat");
    }

    const skip = (page - 1) * limit;

    // Get messages
    const messages = await ProductMessage.find({ productChatId: chatId })
      .populate("sender", "firstName lastName userName profilePicture")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Mark unread messages as read
    const unreadMessageIds = messages
      .filter((msg) => !msg.readBy.includes(userId))
      .map((msg) => msg._id);

    if (unreadMessageIds.length > 0) {
      await ProductMessage.updateMany(
        { _id: { $in: unreadMessageIds } },
        { $push: { readBy: userId } }
      );
    }

    return {
      messages: messages.reverse(), // Return chronologically
      hasMore: messages.length === limit,
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Close product chat
 */
export const closeProductChat = async (chatId, userId) => {
  try {
    const chat = await ProductChat.findById(chatId);
    if (!chat) {
      throw new Error("Chat not found");
    }

    // Only participants can close
    if (chat.owner.toString() !== userId && chat.user.toString() !== userId) {
      throw new Error("Not authorized to close this chat");
    }

    chat.status = PRODUCT_CHAT_STATUS.Closed;
    await chat.save();

    return chat;
  } catch (error) {
    throw error;
  }
};

/**
 * Get unread message count for user
 */
export const getUnreadCount = async (userId) => {
  try {
    // Get all user's chats
    const chats = await ProductChat.find({
      $or: [{ owner: userId }, { user: userId }],
      status: PRODUCT_CHAT_STATUS.Active,
    }).select("_id");

    const chatIds = chats.map((chat) => chat._id);

    // Count unread messages
    const unreadCount = await ProductMessage.countDocuments({
      productChatId: { $in: chatIds },
      sender: { $ne: userId },
      readBy: { $ne: userId },
    });

    return unreadCount;
  } catch (error) {
    throw error;
  }
};

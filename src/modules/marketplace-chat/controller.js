import apiError from "../../utils/apiError.js";
import { MESSEGES } from "../../constants/messages.js";
import {
  createOrGetMarketplaceChat,
  getUserMarketplaceChats,
  sendMarketplaceMessage,
  getMarketplaceChatMessages,
  markMessagesAsRead,
  deleteMarketplaceMessage,
  editMarketplaceMessage,
  toggleMarketplaceMessageReaction,
  toggleBlockUserInChat,
  toggleArchiveChat,
  searchMarketplaceChatMessages,
  getChatStatistics,
} from "./services.js";
import {
  validateCreateMarketplaceChat,
  validateSendMarketplaceMessage,
  validateGetMessages,
  validateMarketplaceMessageReaction,
  validateEditMarketplaceMessage,
  validateDeleteMarketplaceMessage,
  validateSearchMarketplaceMessages,
  validateBlockUser,
  validateArchiveChat,
  validateGetMarketplaceChats,
} from "./validations.js";
import { uploadImage } from "../../utils/cloudinaryutil.js";

export const accessOrCreateMarketplaceChat = async (req, res, next) => {
  try {
    const validationResult = validateCreateMarketplaceChat(req.body);
    if (validationResult.error) {
      return next(apiError.badRequest(validationResult.msg));
    }

    const { sellerId, productId } = req.body;
    const buyerId = req.userId;

    if (buyerId === sellerId) {
      return next(apiError.badRequest("You cannot start a chat with yourself"));
    }

    const chat = await createOrGetMarketplaceChat(buyerId, sellerId, productId);

    return res.status(200).json({
      success: true,
      message: "Marketplace chat accessed successfully",
      data: { chat },
    });
  } catch (error) {
    console.error("Access marketplace chat error:", error);
    return next(apiError.internal(error.message));
  }
};

export const getMarketplaceChats = async (req, res, next) => {
  try {
    const validationResult = validateGetMarketplaceChats(req.query);
    if (validationResult.error) {
      return next(apiError.badRequest(validationResult.msg));
    }

    const { page = 1, limit = 20 } = req.query;
    const userId = req.userId;

    const chats = await getUserMarketplaceChats(
      userId,
      parseInt(page),
      parseInt(limit)
    );

    return res.status(200).json({
      success: true,
      message: "Marketplace chats fetched successfully",
      data: {
        chats,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          hasMore: chats.length === parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error("Get marketplace chats error:", error);
    return next(apiError.internal(error.message));
  }
};

export const sendMessage = async (req, res, next) => {
  try {
    const validationResult = validateSendMarketplaceMessage(req.body);
    if (validationResult.error) {
      return next(apiError.badRequest(validationResult.msg));
    }

    const {
      chatId,
      content,
      messageType = "text",
      replyTo,
      sharedProduct,
      offerDetails,
    } = req.body;

    const senderId = req.userId;
    let media = null;

    if (req.files && req.files.length > 0) {
      try {
        media = [];
        for (const file of req.files) {
          const result = await uploadImage(file, {
            folder: "marketplace-chat",
          });
          media.push({
            url: result.url,
            public_id: result.public_id,
            type: file.mimetype.startsWith("video/") ? "video" : "image",
          });
        }
      } catch (uploadError) {
        console.error("Media upload error:", uploadError);
        return next(apiError.internal("Failed to upload media"));
      }
    }

    const message = await sendMarketplaceMessage(
      senderId,
      chatId,
      content,
      messageType,
      media,
      replyTo,
      sharedProduct,
      offerDetails
    );
    const io = req.app.get("io");
    if (io) {
      io.to(chatId).emit("new marketplace message", {
        message,
        chatId,
      });
    }

    return res.status(201).json({
      success: true,
      message: "Message sent successfully",
      data: { message },
    });
  } catch (error) {
    console.error("Send marketplace message error:", error);
    return next(apiError.internal(error.message));
  }
};

export const getChatMessages = async (req, res, next) => {
  try {
    const { chatId } = req.params;
    const validationResult = validateGetMessages({ chatId, ...req.query });
    if (validationResult.error) {
      return next(apiError.badRequest(validationResult.msg));
    }

    const { page = 1, limit = 50 } = req.query;
    const userId = req.userId;

    const messages = await getMarketplaceChatMessages(
      chatId,
      userId,
      parseInt(page),
      parseInt(limit)
    );

    return res.status(200).json({
      success: true,
      message: "Messages fetched successfully",
      data: {
        messages,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          hasMore: messages.length === parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error("Get chat messages error:", error);
    return next(apiError.internal(error.message));
  }
};

export const markChatMessagesAsRead = async (req, res, next) => {
  try {
    const { chatId } = req.params;
    const userId = req.userId;

    await markMessagesAsRead(chatId, userId);

    const io = req.app.get("io");
    if (io) {
      io.to(chatId).emit("messages read", {
        chatId,
        userId,
        readAt: new Date(),
      });
    }

    return res.status(200).json({
      success: true,
      message: "Messages marked as read",
    });
  } catch (error) {
    console.error("Mark messages as read error:", error);
    return next(apiError.internal(error.message));
  }
};

export const deleteMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const validationResult = validateDeleteMarketplaceMessage({
      messageId,
      ...req.body,
    });
    if (validationResult.error) {
      return next(apiError.badRequest(validationResult.msg));
    }

    const { deleteType = "forMe" } = req.body;
    const userId = req.userId;

    const message = await deleteMarketplaceMessage(
      messageId,
      userId,
      deleteType
    );

    const io = req.app.get("io");
    if (io && message.chat) {
      io.to(message.chat.toString()).emit("message deleted", {
        messageId,
        deleteType,
        userId,
      });
    }

    return res.status(200).json({
      success: true,
      message: `Message deleted ${
        deleteType === "forEveryone" ? "for everyone" : "for you"
      }`,
    });
  } catch (error) {
    console.error("Delete message error:", error);
    return next(apiError.internal(error.message));
  }
};

export const editMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const validationResult = validateEditMarketplaceMessage({
      messageId,
      ...req.body,
    });
    if (validationResult.error) {
      return next(apiError.badRequest(validationResult.msg));
    }

    const { content } = req.body;
    const userId = req.userId;

    const message = await editMarketplaceMessage(messageId, userId, content);

    const io = req.app.get("io");
    if (io && message.chat) {
      io.to(message.chat.toString()).emit("message edited", {
        message,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Message edited successfully",
      data: { message },
    });
  } catch (error) {
    console.error("Edit message error:", error);
    return next(apiError.internal(error.message));
  }
};

export const toggleMessageReaction = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const validationResult = validateMarketplaceMessageReaction({
      messageId,
      ...req.body,
    });
    if (validationResult.error) {
      return next(apiError.badRequest(validationResult.msg));
    }

    const { emoji } = req.body;
    const userId = req.userId;

    const message = await toggleMarketplaceMessageReaction(
      messageId,
      userId,
      emoji
    );

    const io = req.app.get("io");
    if (io && message.chat) {
      io.to(message.chat.toString()).emit("message reaction", {
        messageId,
        emoji,
        userId,
        reactions: message.reactions,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Reaction toggled successfully",
      data: { reactions: message.reactions },
    });
  } catch (error) {
    console.error("Toggle reaction error:", error);
    return next(apiError.internal(error.message));
  }
};

export const blockUser = async (req, res, next) => {
  try {
    const { chatId } = req.params;
    const validationResult = validateBlockUser({
      chatId,
      ...req.body,
    });
    if (validationResult.error) {
      return next(apiError.badRequest(validationResult.msg));
    }

    const { targetUserId } = req.body;
    const userId = req.userId;

    const result = await toggleBlockUserInChat(chatId, userId, targetUserId);

    return res.status(200).json({
      success: true,
      message: `User ${
        result.isBlocked ? "blocked" : "unblocked"
      } successfully`,
      data: { isBlocked: result.isBlocked },
    });
  } catch (error) {
    console.error("Block user error:", error);
    return next(apiError.internal(error.message));
  }
};

export const archiveChat = async (req, res, next) => {
  try {
    const { chatId } = req.params;
    const validationResult = validateArchiveChat({ chatId });
    if (validationResult.error) {
      return next(apiError.badRequest(validationResult.msg));
    }

    const userId = req.userId;
    const result = await toggleArchiveChat(chatId, userId);

    return res.status(200).json({
      success: true,
      message: `Chat ${
        result.isArchived ? "archived" : "unarchived"
      } successfully`,
      data: { isArchived: result.isArchived },
    });
  } catch (error) {
    console.error("Archive chat error:", error);
    return next(apiError.internal(error.message));
  }
};

export const searchMessages = async (req, res, next) => {
  try {
    const { chatId } = req.params;
    const validationResult = validateSearchMarketplaceMessages({
      chatId,
      ...req.query,
    });
    if (validationResult.error) {
      return next(apiError.badRequest(validationResult.msg));
    }

    const { query, page = 1, limit = 20 } = req.query;
    const userId = req.userId;

    const messages = await searchMarketplaceChatMessages(
      chatId,
      userId,
      query,
      parseInt(page),
      parseInt(limit)
    );

    return res.status(200).json({
      success: true,
      message: "Messages searched successfully",
      data: {
        messages,
        searchQuery: query,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          hasMore: messages.length === parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error("Search messages error:", error);
    return next(apiError.internal(error.message));
  }
};

export const getChatStats = async (req, res, next) => {
  try {
    const { chatId } = req.params;
    const userId = req.userId;

    const stats = await getChatStatistics(chatId, userId);

    return res.status(200).json({
      success: true,
      message: "Chat statistics fetched successfully",
      data: { stats },
    });
  } catch (error) {
    console.error("Get chat stats error:", error);
    return next(apiError.internal(error.message));
  }
};

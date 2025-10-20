import apiError from "../../utils/apiError.js";
import { MESSEGES } from "../../constants/messages.js";
import { MESSAGE_REACTIONS } from "../../constants/enums.js";
import { User } from "../users/model.js";
import { Chat, Message } from "./model.js";
import {
  createChat,
  getChatById,
  getMessages,
  getUserChats,
  findOneOnOneChat,
  sendMessage,
  deleteMessageById,
  getMessageById,
  editMessageById,
  toggleMessageReaction,
  deleteAllMessagesInChat,
  deleteMessageForMe,
  deleteMessageForEveryone,
  searchMessagesInChatService,
  setChatWallpaper,
  resetChatWallpaper,
  globalSearchService,
} from "./services.js";
import {
  validateCreateChat,
  validateSendMessage,
  validateMessageReaction,
  validateGlobalSearch,
} from "./validations.js";
import { uploadImage } from "../../utils/cloudinaryutil.js";
import { MESSAGE_REACTIONS as REACTIONS } from "../../constants/enums.js";
import { MarketPlace } from "../market-place/model.js";

export const accessOrCreateChat = async (req, res, next) => {
  try {
    const validationResult = validateCreateChat(req.body);
    if (validationResult.error) {
      return next(apiError.badRequest(validationResult.msg));
    }

    const { userId } = req.body;

    let chat = await findOneOnOneChat(req.userId, userId);

    if (chat) {
      return res.status(200).json({
        message: "Chat fetched successfully",
        chat,
      });
    }
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return next(apiError.notFound(MESSEGES.USER_NOT_FOUND));
    }

    chat = await createChat([req.userId, userId]);

    res.status(201).json({
      message: "Chat created successfully",
      chat,
    });
  } catch (error) {
    console.error("Error accessing or creating chat:", error);
    next(apiError.internal(MESSEGES.SERVER_ERROR));
  }
};

export const fetchUserChats = async (req, res, next) => {
  try {
    const chats = await getUserChats(req.userId);

    res.status(200).json({
      message: "Chats fetched successfully",
      chats,
    });
  } catch (error) {
    console.error("Error fetching user chats:", error);
    next(apiError.internal(MESSEGES.SERVER_ERROR));
  }
};

export const readChat = async (req, res, next) => {
  try {
    const { chatId } = req.params;

    const chat = await getChatById(chatId);
    if (!chat) {
      return next(apiError.notFound("Chat not found"));
    }

    // Check if user is a member of this chat
    if (
      !chat.users.some((user) => user._id.toString() === req.userId.toString())
    ) {
      return next(apiError.forbidden("You are not a member of this chat"));
    }

    res.status(200).json({
      message: "Chat fetched successfully",
      chat,
    });
  } catch (error) {
    console.error("Error reading chat:", error);
    next(apiError.internal(MESSEGES.SERVER_ERROR));
  }
};

export const sendNewMessage = async (req, res, next) => {
  try {
    const validationResult = validateSendMessage(req.body);
    if (validationResult.error) {
      return next(apiError.badRequest(validationResult.msg));
    }

    const { content, chatId, replyTo, productId, productData } = req.body;

    const chat = await getChatById(chatId);
    if (!chat) {
      return next(apiError.notFound(MESSEGES.CHAT_NOT_FOUND));
    }

    if (
      !chat.users.some((user) => user._id.toString() === req.userId.toString())
    ) {
      return next(apiError.forbidden("You are not a member of this chat"));
    }

    if (replyTo) {
      const replyToMessage = await getMessageById(replyTo);
      if (!replyToMessage) {
        return next(apiError.notFound("Reply message not found"));
      }

      if (replyToMessage.chat.toString() !== chatId) {
        return next(
          apiError.badRequest("Cannot reply to a message from another chat")
        );
      }
    }

    let media = null;
    if (req.file) {
      const type = req.file.mimetype.startsWith("video") ? "video" : "image";
      const uploaded = await uploadImage(req.file, {
        folder: "chat_media",
        resource_type: type,
      });
      media = {
        url: uploaded.url,
        public_id: uploaded.public_id,
        type,
      };
    }

    if (productId) {
      const product = await MarketPlace.findById(productId);
      if (!product) {
        return next(apiError.notFound("Product not found"));
      }
    }

    let parsedProductData = productData;
    if (productData && typeof productData === "string") {
      try {
        parsedProductData = JSON.parse(productData);
      } catch (parseError) {
        return next(apiError.badRequest("Invalid JSON format in productData"));
      }
    }

    const message = await sendMessage(
      req.userId,
      content,
      chatId,
      media,
      replyTo,
      productId,
      parsedProductData
    );

    const io = req.app.get("io");
    if (io) {
      io.to(chatId).emit("new message", message);
    }

    res.status(201).json({
      message: "Message sent successfully",
      data: message,
    });
  } catch (error) {
    console.error("Error sending message:", error);
    next(apiError.internal(MESSEGES.SERVER_ERROR));
  }
};

export const getChatMessages = async (req, res, next) => {
  try {
    const chatId = req.params.chatId;
    const page = parseInt(req.query.page);
    const limit = parseInt(req.query.limit);

    if (page < 1 || limit < 1 || limit > 100) {
      return next(
        apiError.badRequest(
          "Invalid pagination parameters. Page must be >= 1 and limit must be between 1-100"
        )
      );
    }

    const chat = await getChatById(chatId);
    if (!chat) {
      return next(apiError.notFound("Chat not found"));
    }

    if (
      !chat.users.some((user) => user._id.toString() === req.userId.toString())
    ) {
      return next(apiError.forbidden("You are not a member of this chat"));
    }

    const totalMessages = await Message.countDocuments({ chat: chatId });
    const result = await getMessages(chatId, req.userId, page, limit);

    res.status(200).json({
      message: "Messages fetched successfully",
      data: result.messages,
      pagination: {
        total: totalMessages,
        page,
        limit,
        totalPages: Math.ceil(totalMessages / limit),
        hasMore: result.pagination.hasMore,
      },
    });
  } catch (error) {
    console.error("Error fetching chat messages:", error);
    next(apiError.internal(MESSEGES.SERVER_ERROR));
  }
};

export const deleteChatMessage = async (req, res, next) => {
  try {
    const messageId = req.params.messageId;
    const message = await deleteMessageById(messageId);
    if (!message) {
      return next(apiError.notFound(MESSEGES.MESSAGE_NOT_FOUND));
    }
    res.status(200).json({
      message: "Message deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting message:", error);
    next(apiError.internal(MESSEGES.SERVER_ERROR));
  }
};

export const deleteMessageJustForMe = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const result = await deleteMessageForMe(messageId, req.userId);

    res.status(200).json({
      message: "Message deleted for user",
      result,
    });
  } catch (error) {
    console.error("Error deleting message for user:", error);
    next(apiError.internal("Failed to delete message for user"));
  }
};

export const deleteMessageEveryone = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const result = await deleteMessageForEveryone(messageId, req.userId);

    res.status(200).json({
      message: "Message deleted for everyone",
      result,
    });
  } catch (error) {
    console.error("Error deleting message for everyone:", error);
    next(apiError.internal("Failed to delete message for everyone"));
  }
};

export const editChatMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;
    const message = await getMessageById(messageId);
    if (!message) {
      return next(apiError.notFound(MESSEGES.MESSAGE_NOT_FOUND));
    }
    if (message.sender.toString() !== req.userId.toString()) {
      return next(apiError.forbidden(MESSEGES.UNAUTHORIZED_ACTION));
    }
    const updatedMessage = await editMessageById(messageId, content);
    res.status(200).json({
      message: "Message updated successfully",
      data: updatedMessage,
    });
  } catch (error) {
    console.error("Error editing message:", error);
    next(apiError.internal(MESSEGES.SERVER_ERROR));
  }
};

export const deleteAllMessagesfromChat = async (req, res, next) => {
  try {
    const chatId = req.params.chatId;
    const chat = await getChatById(chatId);
    if (!chat) {
      return next(apiError.notFound("Chat not found"));
    }
    if (
      !chat.users.some((user) => user._id.toString() === req.userId.toString())
    ) {
      return next(apiError.forbidden("You are not a member of this chat"));
    }
    await deleteAllMessagesInChat(chatId);
    res.status(200).json({
      message: "All messages in the chat deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting all messages in chat:", error);
    next(apiError.internal(MESSEGES.SERVER_ERROR));
  }
};

export const reactToMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;

    const validationResult = validateMessageReaction(req.body);
    if (validationResult.error) {
      return next(apiError.badRequest(validationResult.msg));
    }

    const messageExists = await getMessageById(messageId);
    if (!messageExists) {
      return next(apiError.notFound(MESSEGES.MESSAGE_NOT_FOUND));
    }

    if (!Object.values(MESSAGE_REACTIONS).includes(emoji)) {
      return next(apiError.badRequest("Invalid emoji reaction"));
    }

    const updatedMessage = await toggleMessageReaction(
      messageId,
      req.userId,
      emoji
    );

    const io = req.app.get("io");
    if (io) {
      io.to(updatedMessage.chat._id.toString()).emit(
        "messageReaction",
        updatedMessage
      );
    }

    res.status(200).json({
      message: "Message reaction updated successfully",
      data: updatedMessage,
    });
  } catch (error) {
    console.error("Error toggling message reaction:", error);
    next(apiError.internal(MESSEGES.SERVER_ERROR));
  }
};

export const updateChatWallpaper = async (req, res, next) => {
  try {
    const { chatId } = req.params;
    const { type, value } = req.body;

    const chat = await getChatById(chatId);
    if (!chat) return next(apiError.notFound(MESSEGES.CHAT_NOT_FOUND));

    if (!chat.users.some((u) => u._id.toString() === req.userId.toString())) {
      return next(apiError.forbidden("You are not a member of this chat"));
    }

    let updatedChat;
    if (req.file) {
      updatedChat = await setChatWallpaper(chatId, null, req.file);
    } else {
      updatedChat = await setChatWallpaper(chatId, { type, value });
    }

    res.status(200).json({
      message: "Chat wallpaper updated",
      chat: updatedChat,
    });
  } catch (error) {
    console.error("Error updating wallpaper:", error);
    next(apiError.internal(MESSEGES.SERVER_ERROR));
  }
};

export const removeChatWallpaper = async (req, res, next) => {
  try {
    const { chatId } = req.params;

    const chat = await getChatById(chatId);
    if (!chat) return next(apiError.notFound(MESSEGES.CHAT_NOT_FOUND));

    if (!chat.users.some((u) => u._id.toString() === req.userId.toString())) {
      return next(apiError.forbidden("You are not a member of this chat"));
    }

    const updatedChat = await resetChatWallpaper(chatId);

    res.status(200).json({
      message: "Chat wallpaper removed",
      chat: updatedChat,
    });
  } catch (error) {
    console.error("Error removing wallpaper:", error);
    next(apiError.internal(MESSEGES.SERVER_ERROR));
  }
};

export const getChatWallpaper = async (req, res, next) => {
  try {
    const { chatId } = req.params;

    const chat = await getChatById(chatId);
    if (!chat) return next(apiError.notFound(MESSEGES.CHAT_NOT_FOUND));

    if (!chat.users.some((u) => u._id.toString() === req.userId.toString())) {
      return next(apiError.forbidden("You are not a member of this chat"));
    }

    res.status(200).json({
      message: "Chat wallpaper fetched successfully",
      wallpaper: chat.wallpaper || null,
    });
  } catch (error) {
    console.error("Error fetching wallpaper:", error);
    next(apiError.internal(MESSEGES.SERVER_ERROR));
  }
};

export const searchMessagesBetweenUsers = async (req, res, next) => {
  try {
    const { chatId, query } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    if (!chatId)
      return next(apiError.badRequest("Query parameter 'chatId' is required"));
    if (!query || query.trim().length === 0)
      return next(apiError.badRequest("Query parameter 'query' is required"));

    const chat = await getChatById(chatId);
    if (!chat) return next(apiError.notFound(MESSEGES.CHAT_NOT_FOUND));

    if (!chat.users.some((u) => u._id.toString() === req.userId.toString())) {
      return next(apiError.forbidden("You are not a member of this chat"));
    }

    const result = await searchMessagesInChatService(
      chatId,
      req.userId,
      query,
      page,
      limit
    );

    res.status(200).json({
      message: "Search results fetched successfully",
      data: result.messages,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error("Error searching messages between users:", error);
    next(apiError.internal(MESSEGES.SERVER_ERROR));
  }
};

export const globalSearch = async (req, res, next) => {
  try {
    const validationResult = validateGlobalSearch(req.query);
    if (validationResult.error) {
      return next(apiError.badRequest(validationResult.msg));
    }

    const { query, page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const result = await globalSearchService(
      req.userId,
      query.trim(),
      pageNum,
      limitNum
    );

    res.status(200).json({
      message: "Global search results fetched successfully",
      data: result.results,
      pagination: result.pagination,
      summary: result.summary,
    });
  } catch (error) {
    console.error("Error in global search:", error);
    next(apiError.internal(MESSEGES.SERVER_ERROR));
  }
};

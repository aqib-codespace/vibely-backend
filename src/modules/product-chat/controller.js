import apiError from "../../utils/apiError.js";
import { MESSEGES } from "../../constants/messages.js";
import {
  createOrGetProductChat,
  getUserProductChats,
  sendProductMessage,
  getProductChatMessages,
  closeProductChat,
  getUnreadCount,
} from "./services.js";
import { uploadImage } from "../../utils/cloudinaryutil.js";

/**
 * Start or get product chat
 */
export const startProductChat = async (req, res, next) => {
  try {
    const { productId } = req.body;

    if (!productId) {
      return next(apiError.badRequest("Product ID is required"));
    }

    const chat = await createOrGetProductChat(productId, req.userId);

    res.status(200).json({
      message: "Product chat accessed successfully",
      chat,
    });
  } catch (error) {
    console.error("Error starting product chat:", error);
    if (error.message.includes("Cannot chat about your own product")) {
      return next(apiError.badRequest(error.message));
    }
    if (error.message.includes("Product not found")) {
      return next(apiError.notFound(error.message));
    }
    next(apiError.internal(MESSEGES.SERVER_ERROR));
  }
};

/**
 * Get user's product chats
 */
export const fetchUserProductChats = async (req, res, next) => {
  try {
    const chats = await getUserProductChats(req.userId);
    const unreadCount = await getUnreadCount(req.userId);

    res.status(200).json({
      message: "Product chats fetched successfully",
      chats,
      unreadCount,
    });
  } catch (error) {
    console.error("Error fetching product chats:", error);
    next(apiError.internal(MESSEGES.SERVER_ERROR));
  }
};

/**
 * Send message in product chat
 */
export const sendProductChatMessage = async (req, res, next) => {
  try {
    const { content, chatId } = req.body;

    if (!content || !chatId) {
      return next(apiError.badRequest("Content and chatId are required"));
    }

    let media = null;
    if (req.file) {
      const type = req.file.mimetype.startsWith("video") ? "video" : "image";
      const uploaded = await uploadImage(req.file, {
        folder: "product_chat_media",
        resource_type: type,
      });
      media = {
        url: uploaded.url,
        public_id: uploaded.public_id,
        type,
      };
    }

    const message = await sendProductMessage(
      chatId,
      req.userId,
      content,
      media
    );

    // Emit real-time message
    const io = req.app.get("io");
    if (io) {
      io.to(chatId).emit("new product message", message);
    }

    res.status(201).json({
      message: "Message sent successfully",
      data: message,
    });
  } catch (error) {
    console.error("Error sending product message:", error);
    if (
      error.message.includes("not authorized") ||
      error.message.includes("not found")
    ) {
      return next(apiError.badRequest(error.message));
    }
    next(apiError.internal(MESSEGES.SERVER_ERROR));
  }
};

/**
 * Get messages for product chat
 */
export const getProductMessages = async (req, res, next) => {
  try {
    const { chatId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;

    if (page < 1 || limit < 1 || limit > 100) {
      return next(
        apiError.badRequest("Invalid pagination. Page >= 1, limit 1-100")
      );
    }

    const result = await getProductChatMessages(
      chatId,
      req.userId,
      page,
      limit
    );

    res.status(200).json({
      message: "Messages fetched successfully",
      ...result,
    });
  } catch (error) {
    console.error("Error fetching product messages:", error);
    if (
      error.message.includes("not authorized") ||
      error.message.includes("not found")
    ) {
      return next(apiError.badRequest(error.message));
    }
    next(apiError.internal(MESSEGES.SERVER_ERROR));
  }
};

/**
 * Close product chat
 */
export const closeChat = async (req, res, next) => {
  try {
    const { chatId } = req.params;

    const chat = await closeProductChat(chatId, req.userId);

    res.status(200).json({
      message: "Chat closed successfully",
      chat,
    });
  } catch (error) {
    console.error("Error closing chat:", error);
    if (
      error.message.includes("not authorized") ||
      error.message.includes("not found")
    ) {
      return next(apiError.badRequest(error.message));
    }
    next(apiError.internal(MESSEGES.SERVER_ERROR));
  }
};

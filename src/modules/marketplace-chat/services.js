import mongoose from "mongoose";
import { MarketplaceChat, MarketplaceMessage } from "./model.js";
import { MarketPlace } from "../market-place/model.js";
import { User } from "../users/model.js";
import { uploadImage } from "../../utils/cloudinaryutil.js";
import apiError from "../../utils/apiError.js";
import { MESSEGES } from "../../constants/messages.js";

export const createOrGetMarketplaceChat = async (
  buyerId,
  sellerId,
  productId
) => {
  try {
    const product = await MarketPlace.findById(productId);
    if (!product) {
      throw apiError.notFound("Product not found");
    }
    let chat = await MarketplaceChat.findOne({
      participants: { $all: [buyerId, sellerId] },
      productRef: productId,
      isActive: true,
    })
      .populate("participants", "firstName lastName profilePicture isOnline")
      .populate("productRef", "name price images")
      .populate({
        path: "lastMessage",
        populate: {
          path: "sender",
          select: "firstName lastName profilePicture",
        },
      });

    if (!chat) {
      try {
        chat = new MarketplaceChat({
          participants: [buyerId, sellerId],
          productRef: productId,
        });

        await chat.save();
        chat = await MarketplaceChat.findById(chat._id)
          .populate(
            "participants",
            "firstName lastName profilePicture isOnline"
          )
          .populate("productRef", "name price images")
          .populate({
            path: "lastMessage",
            populate: {
              path: "sender",
              select: "firstName lastName profilePicture",
            },
          });
      } catch (saveError) {
        if (saveError.code === 11000) {
          console.log(
            "Duplicate key error, attempting to find existing chat..."
          );
          chat = await MarketplaceChat.findOne({
            participants: { $all: [buyerId, sellerId] },
            productRef: productId,
            isActive: true,
          })
            .populate(
              "participants",
              "firstName lastName profilePicture isOnline"
            )
            .populate("productRef", "name price images")
            .populate({
              path: "lastMessage",
              populate: {
                path: "sender",
                select: "firstName lastName profilePicture",
              },
            });

          if (!chat) {
            throw new Error(
              "Unable to create or find marketplace chat. Please contact support."
            );
          }
        } else {
          throw saveError;
        }
      }
    }

    return chat;
  } catch (error) {
    throw error;
  }
};

export const getUserMarketplaceChats = async (userId, page = 1, limit = 20) => {
  try {
    const skip = (page - 1) * limit;

    const chats = await MarketplaceChat.find({
      participants: userId,
      isActive: true,
      archivedBy: { $not: { $elemMatch: { userId: userId } } },
    })
      .populate("participants", "firstName lastName profilePicture isOnline")
      .populate("productRef", "name price images")
      .populate({
        path: "lastMessage",
        populate: {
          path: "sender",
          select: "firstName lastName profilePicture",
        },
      })
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit);
    const chatsWithUnreadCount = await Promise.all(
      chats.map(async (chat) => {
        const unreadCount = await MarketplaceMessage.countDocuments({
          chat: chat._id,
          sender: { $ne: userId },
          readBy: { $not: { $elemMatch: { user: userId } } },
          deletedFor: { $not: { $elemMatch: { user: userId } } },
        });

        return {
          ...chat.toObject(),
          unreadCount,
        };
      })
    );

    return chatsWithUnreadCount;
  } catch (error) {
    throw error;
  }
};

export const sendMarketplaceMessage = async (
  senderId,
  chatId,
  content,
  messageType = "text",
  media = null,
  replyTo = null,
  sharedProduct = null,
  offerDetails = null
) => {
  try {
    const chat = await MarketplaceChat.findById(chatId);
    if (!chat) {
      throw apiError.notFound("Chat not found");
    }

    if (!chat.participants.includes(senderId)) {
      throw apiError.forbidden("You are not a participant in this chat");
    }

    if (chat.isBlocked(senderId)) {
      throw apiError.forbidden("You are blocked from this chat");
    }

    const messageData = {
      sender: senderId,
      chat: chatId,
      content,
      messageType,
    };

    if (media && media.length > 0) {
      messageData.media = media;
    }

    if (replyTo) {
      messageData.replyTo = replyTo;
    }

    if (sharedProduct) {
      messageData.sharedProduct = sharedProduct;
      messageData.messageType = "product_share";
    }

    if (offerDetails) {
      messageData.offerDetails = offerDetails;
      messageData.messageType = "offer";
    }

    const message = await MarketplaceMessage.create(messageData);

    chat.lastMessage = message._id;
    chat.updatedAt = Date.now();
    await chat.save();

    const populatedMessage = await MarketplaceMessage.findById(message._id)
      .populate("sender", "firstName lastName profilePicture")
      .populate("replyTo", "content sender")
      .populate("sharedProduct", "name price images");

    return populatedMessage;
  } catch (error) {
    throw error;
  }
};

export const getMarketplaceChatMessages = async (
  chatId,
  userId,
  page = 1,
  limit = 50
) => {
  try {
    const chat = await MarketplaceChat.findById(chatId);
    if (!chat) {
      throw apiError.notFound("Chat not found");
    }

    if (!chat.participants.includes(userId)) {
      throw apiError.forbidden("You don't have access to this chat");
    }

    const skip = (page - 1) * limit;

    const messages = await MarketplaceMessage.find({
      chat: chatId,
      deletedFor: { $not: { $elemMatch: { user: userId } } },
    })
      .populate("sender", "firstName lastName profilePicture")
      .populate("replyTo", "content sender")
      .populate("sharedProduct", "name price images")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return messages.reverse();
  } catch (error) {
    throw error;
  }
};

export const markMessagesAsRead = async (chatId, userId) => {
  try {
    const result = await MarketplaceMessage.updateMany(
      {
        chat: chatId,
        sender: { $ne: userId },
        "readBy.user": { $ne: userId },
      },
      {
        $push: {
          readBy: {
            user: userId,
            readAt: new Date(),
          },
        },
      }
    );

    return result;
  } catch (error) {
    throw error;
  }
};

export const deleteMarketplaceMessage = async (
  messageId,
  userId,
  deleteType = "forMe"
) => {
  try {
    const message = await MarketplaceMessage.findById(messageId);
    if (!message) {
      throw apiError.notFound("Message not found");
    }

    if (deleteType === "forEveryone") {
      if (!message.sender.equals(userId)) {
        throw apiError.forbidden(
          "You can only delete your own messages for everyone"
        );
      }

      const messageAge = Date.now() - message.createdAt.getTime();
      const twentyFourHours = 24 * 60 * 60 * 1000;

      if (messageAge > twentyFourHours) {
        throw apiError.badRequest(
          "Cannot delete messages older than 24 hours for everyone"
        );
      }

      await MarketplaceMessage.findByIdAndDelete(messageId);
    } else {
      message.deletedFor.push({
        user: userId,
        deletedAt: new Date(),
      });
      await message.save();
    }

    return message;
  } catch (error) {
    throw error;
  }
};

export const editMarketplaceMessage = async (messageId, userId, newContent) => {
  try {
    const message = await MarketplaceMessage.findById(messageId);
    if (!message) {
      throw apiError.notFound("Message not found");
    }

    if (!message.sender.equals(userId)) {
      throw apiError.forbidden("You can only edit your own messages");
    }

    message.editHistory.push({
      content: message.content,
      editedAt: new Date(),
    });

    message.content = newContent;
    message.isEdited = true;
    await message.save();

    return message;
  } catch (error) {
    throw error;
  }
};

export const toggleMarketplaceMessageReaction = async (
  messageId,
  userId,
  emoji
) => {
  try {
    const message = await MarketplaceMessage.findById(messageId);
    if (!message) {
      throw apiError.notFound("Message not found");
    }

    const reactionIndex = message.reactions.findIndex((r) => r.emoji === emoji);

    if (reactionIndex === -1) {
      message.reactions.push({
        emoji,
        users: [userId],
      });
    } else {
      const reaction = message.reactions[reactionIndex];
      const userIndex = reaction.users.findIndex((u) => u.equals(userId));

      if (userIndex === -1) {
        reaction.users.push(userId);
      } else {
        reaction.users.splice(userIndex, 1);
        if (reaction.users.length === 0) {
          message.reactions.splice(reactionIndex, 1);
        }
      }
    }

    await message.save();
    return message;
  } catch (error) {
    throw error;
  }
};

export const toggleBlockUserInChat = async (chatId, userId, targetUserId) => {
  try {
    const chat = await MarketplaceChat.findById(chatId);
    if (!chat) {
      throw apiError.notFound("Chat not found");
    }

    if (!chat.participants.includes(userId)) {
      throw apiError.forbidden("You are not a participant in this chat");
    }

    const isBlocked = chat.isBlocked(targetUserId);

    if (isBlocked) {
      await chat.unblockUser(targetUserId);
    } else {
      await chat.blockUser(targetUserId);
    }

    return { isBlocked: !isBlocked };
  } catch (error) {
    throw error;
  }
};

export const toggleArchiveChat = async (chatId, userId) => {
  try {
    const chat = await MarketplaceChat.findById(chatId);
    if (!chat) {
      throw apiError.notFound("Chat not found");
    }

    if (!chat.participants.includes(userId)) {
      throw apiError.forbidden("You are not a participant in this chat");
    }

    const isArchived = chat.archivedBy.some((archive) =>
      archive.userId.equals(userId)
    );

    if (isArchived) {
      chat.archivedBy = chat.archivedBy.filter(
        (archive) => !archive.userId.equals(userId)
      );
    } else {
      chat.archivedBy.push({
        userId,
        archivedAt: new Date(),
      });
    }

    await chat.save();
    return { isArchived: !isArchived };
  } catch (error) {
    throw error;
  }
};

export const searchMarketplaceChatMessages = async (
  chatId,
  userId,
  query,
  page = 1,
  limit = 20
) => {
  try {
    const chat = await MarketplaceChat.findById(chatId);
    if (!chat || !chat.participants.includes(userId)) {
      throw apiError.forbidden("Access denied");
    }

    const skip = (page - 1) * limit;

    const messages = await MarketplaceMessage.find({
      chat: chatId,
      content: { $regex: query, $options: "i" },
      deletedFor: { $not: { $elemMatch: { user: userId } } },
    })
      .populate("sender", "firstName lastName profilePicture")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return messages;
  } catch (error) {
    throw error;
  }
};

export const getChatStatistics = async (chatId, userId) => {
  try {
    const chat = await MarketplaceChat.findById(chatId);
    if (!chat || !chat.participants.includes(userId)) {
      throw apiError.forbidden("Access denied");
    }

    const [totalMessages, mediaMessages, userMessages] = await Promise.all([
      MarketplaceMessage.countDocuments({
        chat: chatId,
        deletedFor: { $not: { $elemMatch: { user: userId } } },
      }),
      MarketplaceMessage.countDocuments({
        chat: chatId,
        media: { $exists: true, $ne: [] },
        deletedFor: { $not: { $elemMatch: { user: userId } } },
      }),
      MarketplaceMessage.countDocuments({
        chat: chatId,
        sender: userId,
        deletedFor: { $not: { $elemMatch: { user: userId } } },
      }),
    ]);

    return {
      totalMessages,
      mediaMessages,
      userMessages,
      createdAt: chat.createdAt,
    };
  } catch (error) {
    throw error;
  }
};

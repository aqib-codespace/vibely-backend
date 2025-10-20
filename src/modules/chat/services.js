import mongoose from "mongoose";
import { uploadImage } from "../../utils/cloudinaryutil.js";
import { Chat, Message } from "./model.js";
import { MarketPlace } from "../market-place/model.js";
import { createNotification } from "../notifications/services.js";
import { NOTIFICATION_TYPE } from "../../constants/notification-enums.js";
import { User } from "../users/model.js";

export const createChat = async (users) => {
  try {
    const chat = await Chat.create({
      users,
      isGroupChat: false,
    });

    return await Chat.findById(chat._id).populate("users", "-password");
  } catch (error) {
    throw error;
  }
};

export const getUserChats = async (userId) => {
  try {
    return await Chat.find({ users: { $elemMatch: { $eq: userId } } })
      .populate("users", "-password")
      .populate("groupAdmin", "-password")
      .populate("latestMessage")
      .sort({ updatedAt: -1 });
  } catch (error) {
    throw error;
  }
};

export const getChatById = async (chatId) => {
  try {
    return await Chat.findById(chatId)
      .populate("users", "-password")
      .populate("groupAdmin", "-password");
  } catch (error) {
    throw error;
  }
};

export const sendMessage = async (
  sender,
  content,
  chatId,
  media = null,
  replyTo = null,
  productRef = null,
  productData = null
) => {
  try {
    const newMessage = await Message.create({
      sender,
      content,
      chat: chatId,
      media,
      replyTo,
      productRef,
      productData,
      readBy: [sender],
    });

    const message = await Message.findById(newMessage._id)
      .populate("sender", "firstName lastName userName profilePicture")
      .populate("chat")
      .populate({
        path: "replyTo",
        populate: {
          path: "sender",
          select: "firstName lastName userName profilePicture",
        },
      })
      .populate({
        path: "productRef",
        select: "name description price category images userId",
        populate: {
          path: "userId",
          select: "firstName lastName userName profilePicture",
        },
      });

    await Chat.findByIdAndUpdate(chatId, { latestMessage: message._id });

    try {
      const chat = await Chat.findById(chatId).populate(
        "users",
        "firstName lastName"
      );
      const senderUser = await User.findById(sender, "firstName lastName");

      if (chat && senderUser) {
        const recipients = chat.users.filter(
          (user) => user._id.toString() !== sender.toString()
        );

        for (const recipient of recipients) {
          await createNotification({
            recipient: recipient._id,
            sender: sender,
            type: NOTIFICATION_TYPE.NEW_MESSAGE,
            message: chat.isGroupChat
              ? `${senderUser.firstName} ${
                  senderUser.lastName
                } sent a message in ${chat.chatName || "group chat"}`
              : `${senderUser.firstName} ${senderUser.lastName} sent you a message`,
            relatedId: chatId,
          });
        }
      }
    } catch (error) {
      console.error("Failed to create message notification:", error);
    }

    return message;
  } catch (error) {
    throw error;
  }
};

export const getMessages = async (chatId, userId, page = 1, limit = 10) => {
  try {
    const skip = (page - 1) * limit;

    const messages = await Message.find({
      chat: chatId,
      deletedFor: { $ne: userId },
    })
      .populate("sender", "firstName lastName userName profilePicture")
      .populate({
        path: "replyTo",
        populate: {
          path: "sender",
          select: "firstName lastName userName profilePicture",
        },
      })
      .populate({
        path: "productRef",
        select: "name description price category images userId",
        populate: {
          path: "userId",
          select: "firstName lastName userName profilePicture",
        },
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalMessages = await Message.countDocuments({
      chat: chatId,
      deletedFor: { $ne: userId },
    });

    return {
      messages: messages.reverse(),
      pagination: {
        hasMore: skip + messages.length < totalMessages,
      },
    };
  } catch (error) {
    throw error;
  }
};

export const findOneOnOneChat = async (userId, otherUserId) => {
  try {
    return await Chat.findOne({
      isGroupChat: false,
      $and: [
        { users: { $elemMatch: { $eq: userId } } },
        { users: { $elemMatch: { $eq: otherUserId } } },
      ],
    })
      .populate("users", "-password")
      .populate("latestMessage");
  } catch (error) {
    throw error;
  }
};

export const deleteMessageById = async (messageId) => {
  try {
    return await Message.findByIdAndDelete(messageId);
  } catch (error) {
    throw error;
  }
};

export const deleteMessageForMe = async (messageId, userId) => {
  try {
    const message = await Message.findById(messageId);
    if (!message) throw new Error("Message not found");

    if (!message.deletedFor.includes(userId)) {
      message.deletedFor.push(userId);
      await message.save();
    }

    return { success: true, message: "Message deleted for user" };
  } catch (error) {
    throw error;
  }
};

export const deleteMessageForEveryone = async (messageId, userId) => {
  try {
    const message = await Message.findById(messageId);
    if (!message) throw new Error("Message not found");

    if (message.sender.toString() !== userId.toString()) {
      throw new Error("Only sender can delete message for everyone");
    }

    const chat = await Chat.findById(message.chat);

    await Message.findByIdAndDelete(messageId);

    if (chat?.latestMessage?.toString() === messageId.toString()) {
      const lastMessage = await Message.findOne({ chat: chat._id }).sort({
        createdAt: -1,
      });
      await Chat.findByIdAndUpdate(
        chat._id,
        { latestMessage: lastMessage?._id || null },
        { new: true }
      );
    }

    return { success: true, message: "Message deleted for everyone" };
  } catch (error) {
    throw error;
  }
};

export const editMessageById = async (messageId, newContent) => {
  try {
    return await Message.findByIdAndUpdate(
      messageId,
      { content: newContent },
      { new: true }
    );
  } catch (error) {
    throw error;
  }
};

export const getMessageById = async (messageId) => {
  try {
    return await Message.findById(messageId);
  } catch (error) {
    throw error;
  }
};

export const deleteAllMessagesInChat = async (chatId) => {
  try {
    return await Message.deleteMany({ chat: chatId });
  } catch (error) {
    throw error;
  }
};

export const toggleMessageReaction = async (messageId, userId, emoji) => {
  try {
    const message = await Message.findById(messageId);

    if (!message) {
      throw new Error("Message not found");
    }
    const reactionIndex = message.reaction.findIndex(
      (reaction) => reaction.emoji === emoji
    );

    if (reactionIndex !== -1) {
      const userIndex = message.reaction[reactionIndex].users.findIndex(
        (user) => user.toString() === userId.toString()
      );

      if (userIndex !== -1) {
        message.reaction[reactionIndex].users.splice(userIndex, 1);

        if (message.reaction[reactionIndex].users.length === 0) {
          message.reaction.splice(reactionIndex, 1);
        }

        await message.save();
        return await Message.findById(messageId)
          .populate("sender", "firstName lastName userName profilePicture")
          .populate(
            "reaction.users",
            "firstName lastName userName profilePicture"
          );
      }
    }

    for (let i = 0; i < message.reaction.length; i++) {
      const userIndex = message.reaction[i].users.findIndex(
        (user) => user.toString() === userId.toString()
      );

      if (userIndex !== -1) {
        message.reaction[i].users.splice(userIndex, 1);
        if (message.reaction[i].users.length === 0) {
          message.reaction.splice(i, 1);
          i--;
        }
      }
    }

    const newReactionIndex = message.reaction.findIndex(
      (reaction) => reaction.emoji === emoji
    );

    if (newReactionIndex !== -1) {
      message.reaction[newReactionIndex].users.push(userId);
    } else {
      message.reaction.push({
        emoji,
        users: [userId],
      });
    }

    await message.save();

    return await Message.findById(messageId)
      .populate("sender", "firstName lastName userName profilePicture")
      .populate("reaction.users", "firstName lastName userName profilePicture");
  } catch (error) {
    throw error;
  }
};

export const setChatWallpaper = async (chatId, wallpaper, file) => {
  try {
    let wallpaperData = wallpaper;

    if (file) {
      const uploaded = await uploadImage(file, {
        folder: "chat_wallpapers",
        resource_type: "image",
      });
      wallpaperData = {
        type: "image",
        value: uploaded.url,
        public_id: uploaded.public_id,
      };
    }

    const updatedChat = await Chat.findByIdAndUpdate(
      chatId,
      { wallpaper: wallpaperData },
      { new: true }
    )
      .populate("users", "-password")
      .populate("groupAdmin", "-password");

    return updatedChat;
  } catch (error) {
    throw error;
  }
};

export const resetChatWallpaper = async (chatId) => {
  try {
    const updatedChat = await Chat.findByIdAndUpdate(
      chatId,
      { $unset: { wallpaper: "" } },
      { new: true }
    ).populate("users", "-password");
    return updatedChat;
  } catch (error) {
    throw error;
  }
};

export const searchMessagesInChatService = async (
  chatId,
  userId,
  query,
  page = 1,
  limit = 20
) => {
  try {
    const chat = await Chat.findById(chatId).select("_id users");
    if (!chat) {
      return {
        messages: [],
        pagination: { total: 0, page, limit, totalPages: 0, hasMore: false },
      };
    }

    if (!chat.users.some((u) => u.toString() === userId.toString())) {
      return {
        messages: [],
        pagination: { total: 0, page, limit, totalPages: 0, hasMore: false },
      };
    }

    const skip = (page - 1) * limit;
    const searchRegex = new RegExp(
      query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "i"
    );

    const filter = {
      chat: chat._id,
      content: { $regex: searchRegex },
      deletedFor: { $ne: userId },
    };

    const [messages, total] = await Promise.all([
      Message.find(filter)
        .populate("sender", "firstName lastName userName profilePicture")
        .populate({
          path: "replyTo",
          populate: {
            path: "sender",
            select: "firstName lastName userName profilePicture",
          },
        })
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(limit),
      Message.countDocuments(filter),
    ]);

    return {
      messages,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + messages.length < total,
      },
    };
  } catch (error) {
    throw error;
  }
};

export const globalSearchService = async (
  userId,
  query,
  page = 1,
  limit = 20
) => {
  try {
    const skip = (page - 1) * limit;
    const searchRegex = new RegExp(
      query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "i"
    );
    const pipeline = [
      {
        $match: {
          users: new mongoose.Types.ObjectId(userId),
        },
      },

      {
        $lookup: {
          from: "users",
          let: {
            chatUsers: "$users",
            currentUserId: new mongoose.Types.ObjectId(userId),
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $in: ["$_id", "$$chatUsers"] },
                    { $ne: ["$_id", "$$currentUserId"] },
                  ],
                },
              },
            },
            {
              $project: {
                firstName: 1,
                lastName: 1,
                userName: 1,
                profilePicture: 1,
                fullName: { $concat: ["$firstName", " ", "$lastName"] },
              },
            },
          ],
          as: "otherUsers",
        },
      },

      {
        $lookup: {
          from: "messages",
          let: {
            chatId: "$_id",
            searchUserId: new mongoose.Types.ObjectId(userId),
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$chat", "$$chatId"] },
                    { $not: { $in: ["$$searchUserId", "$deletedFor"] } },
                  ],
                },
              },
            },
            {
              $lookup: {
                from: "users",
                localField: "sender",
                foreignField: "_id",
                as: "senderInfo",
              },
            },
            { $unwind: "$senderInfo" },
            {
              $project: {
                content: 1,
                createdAt: 1,
                media: 1,
                sender: {
                  _id: "$senderInfo._id",
                  firstName: "$senderInfo.firstName",
                  lastName: "$senderInfo.lastName",
                  userName: "$senderInfo.userName",
                  profilePicture: "$senderInfo.profilePicture",
                },
              },
            },
          ],
          as: "messages",
        },
      },

      {
        $addFields: {
          matchingFriends: {
            $filter: {
              input: "$otherUsers",
              cond: {
                $or: [
                  {
                    $regexMatch: {
                      input: "$$this.firstName",
                      regex: searchRegex,
                    },
                  },
                  {
                    $regexMatch: {
                      input: "$$this.lastName",
                      regex: searchRegex,
                    },
                  },
                  {
                    $regexMatch: {
                      input: "$$this.userName",
                      regex: searchRegex,
                    },
                  },
                  {
                    $regexMatch: {
                      input: "$$this.fullName",
                      regex: searchRegex,
                    },
                  },
                ],
              },
            },
          },
          matchingMessages: {
            $filter: {
              input: "$messages",
              cond: {
                $regexMatch: { input: "$$this.content", regex: searchRegex },
              },
            },
          },
        },
      },

      {
        $match: {
          $or: [
            { "matchingFriends.0": { $exists: true } },
            { "matchingMessages.0": { $exists: true } },
          ],
        },
      },

      {
        $project: {
          _id: 1,
          isGroupChat: 1,
          chatName: 1,
          otherUsers: 1,
          matchingFriends: 1,
          matchingMessages: {
            $slice: ["$matchingMessages", 5],
          },
          totalMatchingMessages: { $size: "$matchingMessages" },
          latestMatchingMessage: { $arrayElemAt: ["$matchingMessages", -1] },
        },
      },
      {
        $addFields: {
          hasMatchingFriend: { $gt: [{ $size: "$matchingFriends" }, 0] },
          latestMessageTime: "$latestMatchingMessage.createdAt",
        },
      },
      {
        $sort: {
          hasMatchingFriend: -1,
          latestMessageTime: -1,
          _id: 1,
        },
      },
    ];

    const [results, totalResults] = await Promise.all([
      Chat.aggregate([...pipeline, { $skip: skip }, { $limit: limit }]),
      Chat.aggregate([...pipeline, { $count: "total" }]),
    ]);

    const total = totalResults[0]?.total || 0;

    const transformedResults = results.map((chat) => ({
      chatId: chat._id,
      isGroupChat: chat.isGroupChat,
      chatName: chat.chatName,
      otherUsers: chat.otherUsers || [],
      type: chat.matchingFriends.length > 0 ? "friend_match" : "message_match",
      friends: chat.matchingFriends.map((friend) => ({
        _id: friend._id,
        firstName: friend.firstName,
        lastName: friend.lastName,
        userName: friend.userName,
        profilePicture: friend.profilePicture,
        fullName: `${friend.firstName} ${friend.lastName}`,
      })),
      messages: chat.matchingMessages.map((message) => ({
        _id: message._id,
        content: message.content,
        createdAt: message.createdAt,
        media: message.media,
        sender: message.sender,
        highlightedContent: message.content.replace(
          searchRegex,
          `<mark>$&</mark>`
        ),
      })),
      totalMessages: chat.totalMatchingMessages,
      hasMoreMessages: chat.totalMatchingMessages > 5,
    }));

    return {
      results: transformedResults,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + results.length < total,
      },
      summary: {
        totalChatsWithMatches: total,
        friendMatches: transformedResults.filter(
          (r) => r.type === "friend_match"
        ).length,
        messageMatches: transformedResults.filter(
          (r) => r.type === "message_match"
        ).length,
      },
    };
  } catch (error) {
    throw error;
  }
};

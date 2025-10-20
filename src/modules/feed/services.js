import Feed from "./model.js";
import { createNotification } from "../notifications/services.js";
import { NOTIFICATION_TYPE } from "../../constants/notification-enums.js";
import { User } from "../users/model.js";

export const createFeed = async (feedData) => {
  return await Feed.create(feedData);
};
export const getAllFeeds = async ({ skip = 0, limit = 10 } = {}) => {
  return await Feed.find({})
    .populate("user", "username firstName lastName profilePicture")
    .populate("likes", "username profilePicture")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

export const updateFeedInfo = async (feedId, updateData) => {
  return await Feed.findByIdAndUpdate(feedId, updateData, {
    new: true,
    runValidators: true,
  });
};

export const likeFeed = async (feedId, userId) => {
  // First get the post to check if user already liked it
  const feed = await Feed.findById(feedId).populate(
    "user",
    "firstName lastName"
  );

  if (!feed) {
    throw new Error("Post not found");
  }

  // Check if user hasn't already liked the post
  const hasLiked = feed.likes.includes(userId);

  const updatedFeed = await Feed.findByIdAndUpdate(
    feedId,
    {
      $addToSet: { likes: userId },
    },
    { new: true }
  );

  // Send notification if this is a new like and user is not liking their own post
  if (!hasLiked && feed.user._id.toString() !== userId.toString()) {
    try {
      const liker = await User.findById(userId, "firstName lastName");
      if (liker && feed.user) {
        await createNotification({
          recipient: feed.user._id,
          sender: userId,
          type: NOTIFICATION_TYPE.POST_LIKED,
          message: `${liker.firstName} ${liker.lastName} liked your post`,
          relatedId: feedId,
        });
      }
    } catch (error) {
      console.error("Failed to create post like notification:", error);
    }
  }

  return updatedFeed;
};

export const unlikeFeed = async (feedId, userId) => {
  return await Feed.findByIdAndUpdate(feedId, {
    $pull: { likes: userId },
    new: true,
  });
};

export const getFeedById = async (feedId) => {
  return await Feed.findById(feedId)

    .populate("user", "username firstName lastName profilePicture")
    .populate("likes", "username profilePicture");
};

export const getFeedsByUserId = async (
  userId,
  { skip = 0, limit = 10 } = {}
) => {
  return await Feed.find({ user: userId })
    .populate("user", "username firstName lastName profilePicture")
    .populate("likes", "username profilePicture")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

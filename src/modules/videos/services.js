import mongoose from "mongoose";
import { MESSEGES } from "../../constants/messages.js";
import { Videos } from "./model.js";
import { createNotification } from "../notifications/services.js";
import { NOTIFICATION_TYPE } from "../../constants/notification-enums.js";
import { User } from "../users/model.js";

export const uploadVideoService = async (videoData) => {
  const video = await Videos.create(videoData);
  return video;
};

export const getAllVideosService = async ({ skip = 0, limit = 10 } = {}) => {
  return await Videos.find({})
    .populate({
      path: "userId",
      select: "firstName lastName profilePicture username email",
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

export const toggleLikeVideoService = async (videoId, userId) => {
  const video = await Videos.findById(videoId).populate(
    "userId",
    "firstName lastName"
  );
  if (!video) {
    throw new Error(MESSEGES.VIDEO_NOT_FOUND);
  }
  if (!video.likes) {
    video.likes = [];
  }
  const userIdStr = userId.toString();

  const hasLiked = video.likes.some((id) => id.toString() === userIdStr);
  if (hasLiked) {
    video.likes.pull(new mongoose.Types.ObjectId(userId));
  } else {
    video.likes.push(new mongoose.Types.ObjectId(userId));

    // Send notification for new like (not for unlike)
    // Don't notify if user is liking their own video
    if (video.userId._id.toString() !== userId.toString()) {
      try {
        const liker = await User.findById(userId, "firstName lastName");
        if (liker && video.userId) {
          await createNotification({
            recipient: video.userId._id,
            sender: userId,
            type: NOTIFICATION_TYPE.VIDEO_LIKED,
            message: `${liker.firstName} ${liker.lastName} liked your video`,
            relatedId: videoId,
          });
        }
      } catch (error) {
        console.error("Failed to create video like notification:", error);
      }
    }
  }
  await video.save();
  return {
    video,
    liked: !hasLiked,
  };
};

export const toggleSaveVideoService = async (videoId, userId) => {
  const video = await Videos.findById(videoId);
  if (!video) {
    throw new Error(MESSEGES.VIDEO_NOT_FOUND);
  }
  if (!video.isSaved) {
    video.isSaved = [];
  }
  const userIdStr = userId.toString();

  const hasSaved = video.isSaved.some((id) => id.toString() === userIdStr);
  if (hasSaved) {
    video.isSaved.pull(new mongoose.Types.ObjectId(userId));
  } else {
    video.isSaved.push(new mongoose.Types.ObjectId(userId));
  }
  await video.save();
  return {
    video,
    saved: !hasSaved,
  };
};

export const getSavedVideosForUserService = async (
  userId,
  { skip = 0, limit = 10 } = {}
) => {
  return await Videos.find({ isSaved: userId })
    .populate({
      path: "userId",
      select: "firstName lastName profilePicture username email",
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

export const getVideoByIdService = async (videoId) => {
  const video = await Videos.findById(videoId).populate({
    path: "userId",
    select: "firstName lastName profilePicture username email",
  });
  if (!video) {
    throw new Error(MESSEGES.VIDEO_NOT_FOUND);
  }
  return video;
};

export const getSavedVideosByUserService = async (userId) => {
  return await Videos.find({ isSaved: userId })
    .populate({
      path: "userId",
      select: "firstName lastName profilePicture username email",
    })
    .sort({ createdAt: -1 });
};

export const deleteVideoService = async (videoId, userId) => {
  const video = await Videos.findByIdAndDelete(videoId);
  if (!video) {
    throw new Error(MESSEGES.VIDEO_NOT_FOUND);
  }
  if (video.userId.toString() !== userId.toString()) {
    throw new Error(MESSEGES.UNAUTHORIZED);
  }
  return video;
};

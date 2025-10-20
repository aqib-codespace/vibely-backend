import Feed from "./model.js";
import {
  createFeed,
  getAllFeeds,
  getFeedById,
  getFeedsByUserId,
  likeFeed,
  unlikeFeed,
  updateFeedInfo,
} from "./services.js";
import apiError from "../../utils/apiError.js";
import { MESSEGES } from "../../constants/messages.js";
import { validateCreateFeed, validateFeedQueryParams } from "./validations.js";
import { uploadImage, deleteImage } from "../../utils/cloudinaryutil.js";

export const createNewFeed = async (req, res, next) => {
  try {
    const validationResult = validateCreateFeed(req.body);
    if (validationResult.error) {
      return next(apiError.badRequest({ message: validationResult.msg }));
    }

    const { content } = req.body;
    const userId = req.user._id;
    let media = [];

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const type = file.mimetype.startsWith("video") ? "video" : "image";
        const uploaded = await uploadImage(file, {
          folder: type === "video" ? "feed_videos" : "feed_images",
          resource_type: type,
        });
        media.push({
          url: uploaded.url,
          public_id: uploaded.public_id,
          type,
        });
      }
    }

    const feedData = {
      content,
      user: userId,
      media,
    };

    const newFeed = await createFeed(feedData);
    res.status(201).json({ message: MESSEGES.FEED_CREATED, feed: newFeed });
  } catch (error) {
    console.error("Error creating feed:", error);
    next(apiError.internal({ message: MESSEGES.SERVER_ERROR }));
  }
};

export const getFeeds = async (req, res, next) => {
  try {
    const validationResult = validateFeedQueryParams(req.query);
    if (validationResult.error) {
      return next(apiError.badRequest({ message: validationResult.msg }));
    }

    const pageNum = parseInt(req.query.page) || 1;
    const limitNum = parseInt(req.query.limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    const feeds = await getAllFeeds({ skip, limit: limitNum });
    const totalFeeds = await Feed.countDocuments();
    const totalPages = Math.ceil(totalFeeds / limitNum);
    res.status(200).json({
      page: pageNum,
      limit: limitNum,
      totalPages,
      totalFeeds,
      feeds,
    });
  } catch (error) {
    console.error("Error fetching feeds:", error);
    next(apiError.internal({ message: MESSEGES.SERVER_ERROR }));
  }
};

export const likeFeedPost = async (req, res, next) => {
  try {
    const feedId = req.params.id;
    const userId = req.userId;

    const feed = await likeFeed(feedId, userId);
    if (!feed) {
      return next(apiError.notFound({ message: MESSEGES.FEED_NOT_FOUND }));
    }
    res.status(200).json({
      message: "Post liked successfully",
      data: feed,
    });
  } catch (error) {
    console.error("Error liking feed:", error);
    next(apiError.internal({ message: MESSEGES.SERVER_ERROR }));
  }
};

export const unLikePost = async (req, res, next) => {
  try {
    const feedId = req.params.id;
    const userId = req.userId;

    const feed = await unlikeFeed(feedId, userId);
    if (!feed) {
      return next(apiError.notFound({ message: MESSEGES.FEED_NOT_FOUND }));
    }
    res.status(200).json({
      message: "Post unliked successfully",
      data: feed,
    });
  } catch (error) {
    console.error("Error unliking feed:", error);
    next(apiError.internal({ message: MESSEGES.SERVER_ERROR }));
  }
};

export const updateFeedPost = async (req, res, next) => {
  try {
    const feedId = req.params.id;
    const { content, mediaToKeep = [] } = req.body;
    const existingFeed = await Feed.findById(feedId);
    if (!existingFeed) {
      return next(apiError.notFound({ message: MESSEGES.FEED_NOT_FOUND }));
    }

    if (!existingFeed.user.equals(req.userId)) {
      return next(apiError.forbidden(MESSEGES.UNAUTHORIZED));
    }

    const keptMedia = (existingFeed.media || []).filter((m) =>
      mediaToKeep.includes(m.public_id)
    );
    const mediaToDelete = (existingFeed.media || []).filter(
      (m) => !mediaToKeep.includes(m.public_id)
    );

    for (const media of mediaToDelete) {
      try {
        await deleteImage(
          media.public_id,
          media.type === "video" ? "video" : "image"
        );
      } catch (err) {
        console.warn("Failed to delete media:", media.public_id, err);
      }
    }

    let newMedia = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const type = file.mimetype.startsWith("video") ? "video" : "image";
        const uploaded = await uploadImage(file, {
          folder: type === "video" ? "feed_videos" : "feed_images",
          resource_type: type,
        });
        newMedia.push({
          url: uploaded.url,
          public_id: uploaded.public_id,
          type,
        });
      }
    }

    const updatedMedia = [...keptMedia, ...newMedia];

    const updatedFeed = await updateFeedInfo(feedId, {
      content: content || existingFeed.content,
      media: updatedMedia,
    });
    res.status(200).json({
      message: "Feed updated successfully",
      data: updatedFeed,
    });
  } catch (error) {
    console.error("Error updating feed:", error);
    next(apiError.internal({ message: MESSEGES.SERVER_ERROR }));
  }
};

export const deleteFeedPost = async (req, res, next) => {
  try {
    const feedId = req.params.id;
    const existingFeed = await Feed.findById(feedId);
    if (!existingFeed) {
      return next(apiError.notFound({ message: MESSEGES.FEED_NOT_FOUND }));
    }
    if (!existingFeed.user.equals(req.userId)) {
      return next(apiError.forbidden(MESSEGES.UNAUTHORIZED));
    }
    for (const media of existingFeed.media) {
      try {
        await deleteImage(
          media.public_id,
          media.type === "video" ? "video" : "image"
        );
      } catch (err) {
        console.warn("Failed to delete media:", media.public_id, err);
      }
    }
    await Feed.findByIdAndDelete(feedId);
    res.status(200).json({ message: MESSEGES.FEED_DELETED });
  } catch (error) {
    console.error("Error deleting feed:", error);
    next(apiError.internal({ message: MESSEGES.SERVER_ERROR }));
  }
};

export const getFeedPostsById = async (req, res, next) => {
  try {
    const feedId = req.params.id;
    console.log(feedId);
    const feed = await getFeedById(feedId);
    console.log(feed);
    if (!feed) {
      return next(apiError.notFound(MESSEGES.FEED_NOT_FOUND));
    }
    res.status(200).json({ message: MESSEGES.FEED_FETCHED, feed });
  } catch (error) {
    console.error("Error fetching feed by ID:", error);
    next(apiError.internal({ message: MESSEGES.SERVER_ERROR }));
  }
};

export const getUserFeedPosts = async (req, res, next) => {
  try {
    const userId = req.params.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const feeds = await getFeedsByUserId(userId, { skip, limit });

    if (!feeds || feeds.length === 0) {
      return res
        .status(200)
        .json({ message: "No posts found for this user", feeds: [] });
    }

    res.status(200).json({
      message: "User posts fetched successfully",
      feeds,
      pagination: {
        page,
        limit,
        hasMore: feeds.length === limit,
      },
    });
  } catch (error) {
    console.error("Error fetching user feeds:", error);
    next(apiError.internal({ message: MESSEGES.SERVER_ERROR }));
  }
};

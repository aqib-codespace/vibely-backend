import { Videos } from "./model.js";
import { uploadVideo, uploadImage } from "../../utils/cloudinaryutil.js";
import {
  uploadVideoService,
  getAllVideosService,
  toggleLikeVideoService,
  toggleSaveVideoService,
  getVideoByIdService,
  getSavedVideosByUserService,
  deleteVideoService,
} from "./services.js";
import { validateUploadVideo } from "./validations.js";
import apiError from "../../utils/apiError.js";
import { MESSEGES } from "../../constants/messages.js";

export const uploadVideoController = async (req, res, next) => {
  try {
    const validationResult = validateUploadVideo(req.body);
    if (validationResult.error) {
      return next(apiError.badRequest(validationResult.msg));
    }
    if (!req.file) {
      return next(apiError.badRequest(MESSEGES.VIDEO_FILE_REQUIRED));
    }
    const { title, description } = req.body;

    const videoUploadResult = await uploadVideo(req.file, "videos");
    if (!videoUploadResult || !videoUploadResult.secure_url) {
      return next(apiError.internal("Failed to upload video"));
    }

    const userId = req.user._id;
    const videoData = {
      userId,
      title,
      description,
      video: videoUploadResult.secure_url,
    };
    const video = await uploadVideoService(videoData);
    res.status(201).json({
      message: MESSEGES.VIDEO_UPLOADED,
      video,
    });
  } catch (error) {
    console.error("Error uploading video:", error);
    next(apiError.internal(MESSEGES.SERVER_ERROR));
  }
};

export const getAllVideosController = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    const skip = (pageNumber - 1) * limitNumber;
    const videos = await getAllVideosService({ skip, limit: limitNumber });
    const totalVideos = await Videos.countDocuments();
    res.status(200).json({
      message: "Videos fetched successfully",
      videos,
      total: totalVideos,
      page: pageNumber,
      limit: limitNumber,
      totalPages: Math.ceil(totalVideos / limitNumber),
    });
  } catch (error) {
    console.error("Error fetching videos:", error);
    next(apiError.internal(MESSEGES.SERVER_ERROR));
  }
};

export const toggleLikeVideoController = async (req, res, next) => {
  try {
    const { videoId } = req.params;
    const userId = req.user?._id;

    if (!videoId) {
      return next(apiError.badRequest("Video ID is required"));
    }
    if (!userId) {
      return next(apiError.unauthorized("User not authenticated"));
    }

    const result = await toggleLikeVideoService(videoId, userId);

    return res.status(200).json({
      success: true,
      message: result.liked
        ? "Video liked successfully"
        : "Video unliked successfully",
      data: {
        videoId,
        liked: result.liked,
        totalLikes: result.video.likes.length,
      },
    });
  } catch (error) {
    console.error("Error toggling like status:", error);

    if (error.message === MESSEGES.VIDEO_NOT_FOUND) {
      return next(apiError.notFound(error.message));
    }

    return next(apiError.internal(MESSEGES.SERVER_ERROR));
  }
};

export const toggleSaveVideoController = async (req, res, next) => {
  try {
    const { videoId } = req.params;
    const userId = req.user?._id;
    if (!videoId) {
      return next(apiError.badRequest("Video ID is required"));
    }
    if (!userId) {
      return next(apiError.unauthorized("User not authenticated"));
    }
    const result = await toggleSaveVideoService(videoId, userId);
    return res.status(200).json({
      success: true,
      message: result.saved
        ? "Video saved successfully"
        : "Video unsaved successfully",
      data: {
        videoId,
        saved: result.saved,
        totalSaves: result.video.isSaved.length,
      },
    });
  } catch (error) {
    console.error("Error toggling save status:", error);
    if (error.message === MESSEGES.VIDEO_NOT_FOUND) {
      return next(apiError.notFound(error.message));
    }
    return next(apiError.internal(MESSEGES.SERVER_ERROR));
  }
};

export const getVideoByIdController = async (req, res, next) => {
  try {
    const { videoId } = req.params;
    if (!videoId) {
      return next(apiError.badRequest("Video ID is required"));
    }
    const video = await getVideoByIdService(videoId);
    if (!video) {
      return next(apiError.notFound(MESSEGES.VIDEO_NOT_FOUND));
    }
    return res.status(200).json({
      success: true,
      message: "Video fetched successfully",
      data: video,
    });
  } catch (error) {
    console.error("Error fetching video by ID:", error);
    return next(apiError.internal(MESSEGES.SERVER_ERROR));
  }
};

export const getSavedVideosByUserController = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return next(apiError.unauthorized("User not authenticated"));
    }
    const { page = 1, limit = 10 } = req.query;
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    const skip = (pageNumber - 1) * limitNumber;
    const videos = await getSavedVideosByUserService(userId, {
      skip,
      limit: limitNumber,
    });
    const totalVideos = await Videos.countDocuments({ isSaved: userId });
    res.status(200).json({
      message: "Saved videos fetched successfully",
      videos,
      total: totalVideos,
      page: pageNumber,
      limit: limitNumber,
      totalPages: Math.ceil(totalVideos / limitNumber),
    });
  } catch (error) {
    console.error("Error fetching saved videos:", error);
    next(apiError.internal(MESSEGES.SERVER_ERROR));
  }
};

export const deleteVideoController = async (req, res, next) => {
  try {
    const { videoId } = req.params;
    const userId = req.user?._id;
    if (!videoId) {
      return next(apiError.badRequest("Video ID is required"));
    }
    if (!userId) {
      return next(apiError.unauthorized("User not authenticated"));
    }
    await deleteVideoService(videoId, userId);
    return res.status(200).json({
      success: true,
      message: "Video deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting video:", error);
    if (error.message === MESSEGES.VIDEO_NOT_FOUND) {
      return next(apiError.notFound(error.message));
    }
    if (error.message === MESSEGES.UNAUTHORIZED_ACTION) {
      return next(apiError.unauthorized(error.message));
    }
    return next(apiError.internal(MESSEGES.SERVER_ERROR));
  }
};

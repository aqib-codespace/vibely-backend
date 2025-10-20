import {
  createMarketPlaceItemService,
  getMarketPlaceItemsService,
  getMarketPlaceItemByIdService,
  deleteMarketPlaceItemService,
  updateMarketPlaceItemService,
  getUserMarketPlaceItemsService,
} from "./services.js";
import apiError from "../../utils/apiError.js";
import { MESSEGES } from "../../constants/messages.js";
import { validateMarketPlaceInputs } from "./validations.js";
import { uploadImage } from "../../utils/cloudinaryutil.js";
import { deleteImage } from "../../utils/cloudinaryutil.js";
import MarketPlace from "./model.js";

export const createMarketPlaceItem = async (req, res, next) => {
  try {
    let images = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const uploaded = await uploadImage(file, {
          folder: "marketplace_images",
        });
        images.push({ url: uploaded.url, public_id: uploaded.public_id });
      }
    }
    const validateData = {
      name: req.body.name,
      description: req.body.description,
      price: req.body.price,
      category: req.body.category,
      images,
    };
    const validationResult = validateMarketPlaceInputs(validateData);
    if (validationResult.error) {
      return next(apiError.badRequest(validationResult.msg));
    }

    const itemData = {
      ...validateData,
      userId: req.user._id,
      userName: req.user.userName,
      userProfileImage: req.user.profileImage,
    };

    const newItem = await createMarketPlaceItemService(itemData);
    res
      .status(201)
      .json({ success: true, message: MESSEGES.ITEM_CREATED, data: newItem });
  } catch (error) {
    console.error("Error during item creation:", error);
    next(apiError.internal(MESSEGES.SERVER_ERROR));
  }
};

export const getMarketPlaceItems = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    const skip = (pageNumber - 1) * limitNumber;
    const items = await getMarketPlaceItemsService({
      skip,
      limit: limitNumber,
    });
    const totalItems = await MarketPlace.countDocuments();
    res.status(200).json({
      message: MESSEGES.ITEMS_FETCHED,
      items,
      total: totalItems,
      page: pageNumber,
      limit: limitNumber,
      totalPages: Math.ceil(totalItems / limitNumber),
      hasMore: skip + items.length < totalItems,
    });
  } catch (error) {
    console.error("Error fetching market place items:", error);
    next(apiError.internal(MESSEGES.SERVER_ERROR));
  }
};

export const getMarketPlaceItemById = async (req, res, next) => {
  try {
    const { itemId } = req.params;
    if (!itemId) {
      return next(apiError.badRequest("Item ID is required"));
    }
    const item = await getMarketPlaceItemByIdService(itemId);
    if (!item) {
      return next(apiError.notFound("Item not found"));
    }
    res.status(200).json({
      message: "Item fetched successfully",
      item,
    });
  } catch (error) {
    console.error("Error fetching item by ID:", error);
    next(apiError.internal(MESSEGES.SERVER_ERROR));
  }
};

export const deleteMarketPlaceItem = async (req, res, next) => {
  try {
    const { itemId } = req.params;
    if (!itemId) {
      return next(apiError.badRequest("Item ID is required"));
    }
    const item = await getMarketPlaceItemByIdService(itemId);
    if (!item) {
      return next(apiError.notFound("Item not found"));
    }
    const itemOwnerId = item.userId
      ? item.userId._id
        ? item.userId._id.toString()
        : item.userId.toString()
      : null;
    const requestUserId =
      req.user && req.user._id ? req.user._id.toString() : null;

    if (!itemOwnerId || !requestUserId || itemOwnerId !== requestUserId) {
      return next(
        apiError.forbidden("You are not authorized to delete this item")
      );
    }
    await deleteMarketPlaceItemService(itemId);
    res.status(200).json({
      message: "Item deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting item:", error);
    next(apiError.internal(MESSEGES.SERVER_ERROR));
  }
};

export const updateMarketPlaceItem = async (req, res, next) => {
  try {
    const { itemId } = req.params;
    if (!itemId) {
      return next(apiError.badRequest("Item ID is required"));
    }
    const item = await getMarketPlaceItemByIdService(itemId);
    if (!item) {
      return next(apiError.notFound("Item not found"));
    }
    const itemOwnerId = item.userId
      ? item.userId._id
        ? item.userId._id.toString()
        : item.userId.toString()
      : null;
    const requestUserId =
      req.user && req.user._id ? req.user._id.toString() : null;
    if (!itemOwnerId || !requestUserId || itemOwnerId !== requestUserId) {
      return next(
        apiError.forbidden("You are not authorized to update this item")
      );
    }

    let mediaToKeep = [];
    if (Array.isArray(req.body.mediaToKeep)) {
      mediaToKeep = req.body.mediaToKeep;
    } else if (
      typeof req.body.mediaToKeep === "string" &&
      req.body.mediaToKeep
    ) {
      try {
        const parsed = JSON.parse(req.body.mediaToKeep);
        mediaToKeep = Array.isArray(parsed) ? parsed : [String(parsed)];
      } catch (e) {
        mediaToKeep = [req.body.mediaToKeep];
      }
    }

    const existingImages = item.images || [];
    const keptImages = existingImages.filter((img) =>
      mediaToKeep.includes(img.public_id)
    );
    const imagesToDelete = existingImages.filter(
      (img) => !mediaToKeep.includes(img.public_id)
    );
    for (const img of imagesToDelete) {
      try {
        await deleteImage(img.public_id, "image");
      } catch (err) {
        console.warn("Failed to delete marketplace image:", img.public_id, err);
      }
    }
    const newImages = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const uploaded = await uploadImage(file, {
          folder: "marketplace_images",
        });
        newImages.push({ url: uploaded.url, public_id: uploaded.public_id });
      }
    }

    const images = [...keptImages, ...newImages];
    const sanitizedImages = images.map((img) => ({
      url: img && img.url ? img.url : undefined,
      public_id: img && img.public_id ? img.public_id : undefined,
    }));

    const validateData = {
      name: req.body.name,
      description: req.body.description,
      price: req.body.price,
      category: req.body.category,
      images: sanitizedImages,
    };
    const validationResult = validateMarketPlaceInputs(validateData);
    if (validationResult.error) {
      return next(apiError.badRequest(validationResult.msg));
    }
    const updatedItem = await updateMarketPlaceItemService(
      itemId,
      validateData
    );
    res.status(200).json({
      success: true,
      message: "Item updated successfully",
      data: updatedItem,
    });
  } catch (error) {
    console.error("Error updating item:", error);
    next(apiError.internal(MESSEGES.SERVER_ERROR));
  }
};

export const getUserMarketPlaceItems = async (req, res, next) => {
  try {
    const userId = req.user && req.user._id ? req.user._id : null;
    if (!userId) {
      return next(apiError.badRequest("User ID is required"));
    }
    const { page = 1, limit = 10 } = req.query;
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    const skip = (pageNumber - 1) * limitNumber;
    const items = await getUserMarketPlaceItemsService({
      userId,
      skip,
      limit: limitNumber,
    });
    const totalItems = await MarketPlace.countDocuments({ userId });
    res.status(200).json({
      message: "User items fetched successfully",
      items,
      total: totalItems,
      page: pageNumber,
      limit: limitNumber,
      totalPages: Math.ceil(totalItems / limitNumber),
      hasMore: skip + items.length < totalItems,
    });
  } catch (error) {
    console.error("Error fetching user market place items:", error);
    next(apiError.internal(MESSEGES.SERVER_ERROR));
  }
};

import MarketPlace from "./model.js";

export const createMarketPlaceItemService = async (itemData) => {
  const item = await MarketPlace.create(itemData);
  return item;
};

export const getMarketPlaceItemsService = async ({
  skip = 0,
  limit = 10,
} = {}) => {
  return await MarketPlace.find({})
    .populate("userId", "userName firstName lastName profileImage")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

export const getMarketPlaceItemByIdService = async (itemId) => {
  return await MarketPlace.findById(itemId).populate(
    "userId",
    "userName firstName lastName profileImage"
  );
};

export const deleteMarketPlaceItemService = async (itemId) => {
  return await MarketPlace.findByIdAndDelete(itemId);
};

export const updateMarketPlaceItemService = async (itemId, updateData) => {
  return await MarketPlace.findByIdAndUpdate(itemId, updateData, { new: true });
};

export const getUserMarketPlaceItemsService = async ({
  userId,
  skip = 0,
  limit = 10,
}) => {
  return await MarketPlace.find({ userId })
    .populate("userId", "userName firstName lastName profileImage")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

import { Router } from "express";
import {
  createMarketPlaceItem,
  getMarketPlaceItems,
  getMarketPlaceItemById,
  deleteMarketPlaceItem,
  updateMarketPlaceItem,
  getUserMarketPlaceItems,
} from "./controller.js";
import { isAuthenticated } from "../../middleware/auth.js";
import upload from "../../middleware/multer.js";

const router = Router();

router.post(
  "/create-item",
  isAuthenticated,
  upload.array("images", 5),
  createMarketPlaceItem
);
router.get("/items", isAuthenticated, getMarketPlaceItems);
router.get("/item/:itemId", isAuthenticated, getMarketPlaceItemById);
router.delete("/item/:itemId", isAuthenticated, deleteMarketPlaceItem);
router.put(
  "/item/:itemId",
  isAuthenticated,
  upload.array("images", 5),
  updateMarketPlaceItem
);
router.get("/user-items", isAuthenticated, getUserMarketPlaceItems);

export default router;

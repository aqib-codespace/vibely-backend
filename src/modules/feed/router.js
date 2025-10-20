import { Router } from "express";
import {
  createNewFeed,
  unLikePost,
  getFeeds,
  likeFeedPost,
  updateFeedPost,
  deleteFeedPost,
  getFeedPostsById,
  getUserFeedPosts,
} from "./controller.js";
import { isAuthenticated } from "../../middleware/auth.js";
import upload from "../../middleware/multer.js";

const router = Router();

router.post(
  "/create-post",
  isAuthenticated,
  upload.array("media", 4),
  createNewFeed
);
router.post(
  "/update-post/:id",
  isAuthenticated,
  upload.array("media", 4),
  updateFeedPost
);
router.get("/all-posts", isAuthenticated, getFeeds);
router.get("/post/:id", isAuthenticated, getFeedPostsById);
router.get("/user/:userId", isAuthenticated, getUserFeedPosts);
router.post("/like/:id", isAuthenticated, likeFeedPost);
router.post("/unlike/:id", isAuthenticated, unLikePost);
router.delete("/delete/:id", isAuthenticated, deleteFeedPost);

export default router;

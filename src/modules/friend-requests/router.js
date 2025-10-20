import { Router } from "express";
import { isAuthenticated } from "../../middleware/auth.js";
import {
  sendFriendRequest,
  updateFriendRequest,
  deleteFriendRequest,
  getFriendRequests,
  getFriends,
} from "./controller.js";

const router = Router();

router.post("/", isAuthenticated, sendFriendRequest);
router.patch("/:requestId", isAuthenticated, updateFriendRequest);
router.delete("/:requestId", isAuthenticated, deleteFriendRequest);

router.get("/", isAuthenticated, getFriendRequests);
router.get("/friends", isAuthenticated, getFriends);

export default router;

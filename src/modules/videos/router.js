import { Router } from "express";
import { isAuthenticated } from "../../middleware/auth.js";
import upload from "../../middleware/multer.js";
import {
  getAllVideosController,
  uploadVideoController,
  toggleLikeVideoController,
  toggleSaveVideoController,
  getVideoByIdController,
  getSavedVideosByUserController,
  deleteVideoController,
} from "./controller.js";

const router = Router();

router.post(
  "/upload",
  isAuthenticated,
  upload.single("video"),
  uploadVideoController
);

router.get("/get-all", isAuthenticated, getAllVideosController);
router.post("/like/:videoId", isAuthenticated, toggleLikeVideoController);
router.post("/save/:videoId", isAuthenticated, toggleSaveVideoController);
router.get("/:videoId", isAuthenticated, getVideoByIdController);
router.get(
  "/saved/user/:userId",
  isAuthenticated,
  getSavedVideosByUserController
);
router.delete("/delete/:videoId", isAuthenticated, deleteVideoController);

export default router;

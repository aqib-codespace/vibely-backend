import { Router } from "express";
import {
  getUsers,
  signIn,
  SignUp,
  updateProfilePicture,
  updateCoverImage,
  updateUserInfo,
  getUserById,
  forgotPassword,
  verifyPasswordResetCode,
  resetUserPassword,
  verifyEmail,
  resendVerificationEmail,
  getUserStatistics,
  getUserStatisticsById,
  searchUsers,
  changeUserPassword,
} from "./controller.js";

import { isAuthenticated } from "../../middleware/auth.js";
import upload from "../../middleware/multer.js";

const router = Router();

router.post("/signup", SignUp);
router.post("/signin", signIn);

router.post("/verify-email", verifyEmail);
router.post("/resend-verification", resendVerificationEmail);

router.post("/forgot-password", forgotPassword);
router.post("/verify-reset-code", verifyPasswordResetCode);
router.post("/reset-password", resetUserPassword);
router.put("/update-user", isAuthenticated, updateUserInfo);
router.get("/user/:id", isAuthenticated, getUserById);

router.post(
  "/profile-picture",
  isAuthenticated,
  upload.single("profilePicture"),
  updateProfilePicture
);
router.post(
  "/cover-image",
  isAuthenticated,
  upload.single("coverImage"),
  updateCoverImage
);

router.get("/all-users", isAuthenticated, getUsers);
router.get("/search", isAuthenticated, searchUsers);
router.get("/stats", isAuthenticated, getUserStatistics);
router.get("/stats/:userId", isAuthenticated, getUserStatisticsById);

router.put("/change-password", isAuthenticated, changeUserPassword);

export default router;

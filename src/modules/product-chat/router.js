import { Router } from "express";
import { isAuthenticated } from "../../middleware/auth.js";
import {
  startProductChat,
  fetchUserProductChats,
  sendProductChatMessage,
  getProductMessages,
  closeChat,
} from "./controller.js";
import upload from "../../middleware/multer.js";

const router = Router();

router.post("/start", isAuthenticated, startProductChat);
router.get("/", isAuthenticated, fetchUserProductChats);
router.post(
  "/message",
  isAuthenticated,
  upload.single("media"),
  sendProductChatMessage
);
router.get("/messages/:chatId", isAuthenticated, getProductMessages);
router.patch("/close/:chatId", isAuthenticated, closeChat);

export default router;

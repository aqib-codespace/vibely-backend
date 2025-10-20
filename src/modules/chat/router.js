import { Router } from "express";
import { isAuthenticated } from "../../middleware/auth.js";
import {
  accessOrCreateChat,
  deleteAllMessagesfromChat,
  deleteChatMessage,
  editChatMessage,
  fetchUserChats,
  readChat,
  getChatMessages,
  sendNewMessage,
  reactToMessage,
  deleteMessageJustForMe,
  deleteMessageEveryone,
  removeChatWallpaper,
  updateChatWallpaper,
  searchMessagesBetweenUsers,
  getChatWallpaper,
  globalSearch,
} from "./controller.js";
import upload from "../../middleware/multer.js";

const router = Router();

router.post("/chat", isAuthenticated, accessOrCreateChat);
router.get("/", isAuthenticated, fetchUserChats);
router.get("/:chatId/read", isAuthenticated, readChat);
router.post(
  "/message",
  isAuthenticated,
  upload.single("media"),
  sendNewMessage
);
router.get("/messages/search", isAuthenticated, searchMessagesBetweenUsers);
router.get("/messages/:chatId", isAuthenticated, getChatMessages);
router.delete("/message/:messageId", isAuthenticated, deleteChatMessage);
router.post("/message/edit/:messageId", isAuthenticated, editChatMessage);
router.delete(
  "/messages/clear/:chatId",
  isAuthenticated,
  deleteAllMessagesfromChat
);

router.post("/message/reaction/:messageId", isAuthenticated, reactToMessage);
router.delete(
  "/message/:messageId/for-me",
  isAuthenticated,
  deleteMessageJustForMe
);
router.delete(
  "/message/:messageId/for-everyone",
  isAuthenticated,
  deleteMessageEveryone
);

router.put(
  "/:chatId/wallpaper",
  isAuthenticated,
  upload.single("wallpaper"),
  updateChatWallpaper
);

router.get("/:chatId/wallpaper", isAuthenticated, getChatWallpaper);
router.delete("/:chatId/wallpaper", isAuthenticated, removeChatWallpaper);

router.get("/search/global", isAuthenticated, globalSearch);

export default router;

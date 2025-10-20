import express from "express";
import { isAuthenticated } from "../../middleware/auth.js";
import upload from "../../middleware/multer.js";
import {
  accessOrCreateMarketplaceChat,
  getMarketplaceChats,
  sendMessage,
  getChatMessages,
  markChatMessagesAsRead,
  deleteMessage,
  editMessage,
  toggleMessageReaction,
  blockUser,
  archiveChat,
  searchMessages,
  getChatStats} from "./controller.js";

const router = express.Router();

router.use(isAuthenticated);

router.post("/access", accessOrCreateMarketplaceChat);

router.get("/chats", getMarketplaceChats);
router.post("/send", upload.array("media", 5), sendMessage);

router.get("/:chatId/messages", getChatMessages);

router.put("/:chatId/read", markChatMessagesAsRead);

router.delete("/message/:messageId", deleteMessage);

router.put("/message/:messageId", editMessage);

router.post("/message/:messageId/reaction", toggleMessageReaction);

router.post("/:chatId/block", blockUser);

router.post("/:chatId/archive", archiveChat);

router.get("/:chatId/search", searchMessages);

router.get("/:chatId/stats", getChatStats);

export default router;

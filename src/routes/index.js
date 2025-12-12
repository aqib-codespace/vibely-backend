import express from "express";
import users from "../modules/users/router.js";
import feed from "../modules/feed/router.js";
import friends from "../modules/friend-requests/router.js";
import chat from "../modules/chat/router.js";
import productChat from "../modules/product-chat/router.js";
import marketplaceChat from "../modules/marketplace-chat/router.js";
import videos from "../modules/videos/router.js";
import MarketPlace from "../modules/market-place/router.js";
import search from "../modules/search/router.js";
import notifications from "../modules/notifications/router.js";
import internal from "../modules/internal/router.js";

const app = express();
export default (app) => {
  const apiV1Router = express.Router();
  apiV1Router.use("/users", users);
  apiV1Router.use("/feed", feed);
  apiV1Router.use("/friends", friends);
  apiV1Router.use("/chats", chat);
  apiV1Router.use("/product-chats", productChat);
  apiV1Router.use("/marketplace-chat", marketplaceChat);
  apiV1Router.use("/videos", videos);
  apiV1Router.use("/marketPlace", MarketPlace);
  apiV1Router.use("/search", search);
  apiV1Router.use("/notifications", notifications);
  if (process.env.ALLOW_EMAIL_TEST_ROUTE === "true") {
    apiV1Router.use("/internal", internal);
  }
  app.use("/api/v1", apiV1Router);
};

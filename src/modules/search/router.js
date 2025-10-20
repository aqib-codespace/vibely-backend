import express from "express";
import { isAuthenticated } from "../../middleware/auth.js";
import { globalSearch, getSearchSuggestions } from "./controller.js";

const router = express.Router();

const trackRequestTime = (req, res, next) => {
  req.startTime = Date.now();
  next();
};

router.get("/global", isAuthenticated, trackRequestTime, globalSearch);

router.get("/suggestions", isAuthenticated, getSearchSuggestions);

export default router;

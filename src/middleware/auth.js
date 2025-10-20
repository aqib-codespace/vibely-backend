import mongoose from "mongoose";
import apiError from "../utils/apiError.js";
import { MESSEGES } from "../constants/messages.js";
import { verifyToken } from "../utils/token.js";
import User from "../modules/users/model.js";

export const isAuthenticated = async (req, res, next) => {
  try {
    const bareerToken = req.headers.authorization;
    if (!bareerToken) {
      res.status(404);
      return next(
        apiError.badRequest(MESSEGES.AUTHORIZATION_INVALID, "isAuthenticated")
      );
    }
    const token = bareerToken.split(" ")[1];
    if (!token) {
      return next(
        apiError.badRequest(
          MESSEGES.AUTHORIZATION_TOKEN_NOT_FOUND,
          "isAuthenticated"
        )
      );
    }
    const decoded = await verifyToken(token);
    if (!decoded) {
      return next(
        apiError.badRequest(MESSEGES.TOKEN_NOT_VERIFIED, "isAuthenticated")
      );
    }
    const email = decoded.email;
    const user = await User.findOne({ email }).select(
      "-password -confirmPassword -resetToken -resetTokenExpiry"
    );
    if (!user) {
      return next(
        apiError.badRequest(MESSEGES.USER_NOT_FOUND, "isAuthenticated")
      );
    }
    req.userId = new mongoose.Types.ObjectId(user._id);
    req.user = user;
    next();
  } catch (error) {
    console.log(error);
    return next(
      apiError.internal({ message: MESSEGES.SERVER_ERROR }, "isAuthenticated")
    );
  }
};

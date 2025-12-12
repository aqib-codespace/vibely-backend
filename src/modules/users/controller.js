import api from "../../utils/apiError.js";
import {
  createUser,
  findUserById,
  getAllUsers,
  updateUser,
  initiatePasswordReset,
  verifyResetCode,
  resetPassword,
  getUserStats,
  searchUsersWithRelationship,
  changePassword,
} from "./services.js";

import {
  validateSignInInputs,
  validateSignUpInputs,
  validateUserProfileUpdate,
  validateForgotPasswordInput,
  validateResetCodeInput,
  validatePasswordResetInput,
  validateChangePasswordInput,
} from "./validations.js";
import { User } from "./model.js";
import { MESSEGES } from "../../constants/messages.js";
import { generateRefreshToken, generateToken } from "../../utils/token.js";
import { uploadImage, deleteImage } from "../../utils/cloudinaryutil.js";
import {
  sendEmailVerification,
  generateVerificationCode,
  isVerificationTokenExpired,
} from "../../utils/emailService.js";
import apiError from "../../utils/apiError.js";
import { createNotification } from "../notifications/services.js";
import { NOTIFICATION_TYPE } from "../../constants/notification-enums.js";

export const SignUp = async (req, res, next) => {
  try {
    const startTime = Date.now();
    const validationResult = validateSignUpInputs(req.body);
    if (validationResult.error) {
      return next(apiError.badRequest(validationResult.msg));
    }
    const { firstName, lastName, userName, email, password, confirmPassword } =
      req.body;

    const existingUser = await User.findOne({
      $or: [{ email }, { userName }],
    });

    if (existingUser) {
      return next(apiError.badRequest(MESSEGES.USER_ALREADY_EXISTS));
    }

    const verificationCode = generateVerificationCode();
    const verificationExpiry = new Date();
    verificationExpiry.setMinutes(verificationExpiry.getMinutes() + 15); // 15 minutes expiry

    const newUser = new User({
      firstName,
      lastName,
      userName,
      email,
      password,
      emailVerificationToken: verificationCode,
      emailVerificationExpiry: verificationExpiry,
      isEmailVerified: false,
    });

    await createUser(newUser);

    // Fire-and-forget welcome notification so signup isn't delayed by notification delivery
    createNotification({
      recipient: newUser._id,
      sender: null,
      type: NOTIFICATION_TYPE.WELCOME,
      message: `Welcome to Vibely, ${firstName}! Warm hearted welcome from the Vibely team. We're glad you're here.`,
    }).catch((notifErr) => {
      console.error("Failed to create welcome notification:", notifErr);
    });

    // Send verification email asynchronously to avoid blocking signup on SMTP issues
    sendEmailVerification(email, verificationCode, firstName)
      .then((result) => {
        if (!result || !result.success) {
          console.warn("sendEmailVerification returned non-success result:", result);
        }
      })
      .catch((emailError) => {
        console.error("Background email sending failed:", emailError);
      });

    // Respond immediately to the client
    res.status(201).json({
      success: true,
      message: MESSEGES.EMAIL_VERIFICATION_SENT,
    });

    if (process.env.NODE_ENV === "production") {
      console.log(`SignUp completed in ${Date.now() - startTime}ms for ${email}`);
    }
  } catch (error) {
    console.error("Error during sign-up:", error);
    next(apiError.internal(MESSEGES.SERVER_ERROR));
  }
};

export const signIn = async (req, res, next) => {
  try {
    const startTime = Date.now();
    let { password, email } = req.body;

    const validationResult = validateSignInInputs(req.body);
    if (validationResult?.error) {
      return next(apiError.badRequest(validationResult?.msg, "signin"));
    }
    let existingUser = await User.findOne({ email });
    console.log(existingUser, "existingUser");
    if (!existingUser) {
      return next(apiError.badRequest(MESSEGES.USER_DOES_NOT_EXIST, "signin"));
    }
    if (!existingUser.isEmailVerified) {
      return next(apiError.badRequest(MESSEGES.EMAIL_NOT_VERIFIED, "signin"));
    }

    const match = await existingUser?.checkPassword(password);
    if (!match) {
      return next(apiError.badRequest(MESSEGES.PASSWORD_INVALID, "signin"));
    }

    existingUser = existingUser.toObject({ getters: true });

    const token = await generateToken({
      userName: existingUser?.userName,
      email: existingUser?.email,
    });
    const refreshToken = await generateRefreshToken({
      userName: existingUser?.userName,
      email: existingUser?.email,
    });

    delete existingUser.confirmPassword;
    delete existingUser.password;
    delete existingUser.resetToken;
    delete existingUser.resetTokenExpiry;
    delete existingUser.emailVerificationToken;
    delete existingUser.emailVerificationExpiry;

    try {
      if (!existingUser.hasLoggedInBefore) {
        // Fire-and-forget notification to avoid delaying sign-in
        createNotification({
          recipient: existingUser._id,
          sender: null,
          type: NOTIFICATION_TYPE.WELCOME,
          message: `Welcome back to Vibely, ${existingUser.firstName}! Warm hearted welcome from the Vibely team.`,
        }).catch((notifErr) => {
          console.error("Failed to send first-login welcome notification:", notifErr);
        });

        // We still persist the flag but don't wait on notification delivery
        await User.findByIdAndUpdate(existingUser._id, { hasLoggedInBefore: true });
      }
    } catch (notifErr) {
      console.error("Failed to update hasLoggedInBefore flag:", notifErr);
    }

    const responsePayload = {
      isSuccess: true,
      message: MESSEGES.SIGNIN_SUCCESSFULL,
      token,
      refreshToken,
      data: existingUser,
    };

    if (process.env.NODE_ENV === "production") {
      console.log(`SignIn completed in ${Date.now() - startTime}ms for ${email}`);
    }

    return res.status(200).send(responsePayload);
  } catch (error) {
    return next(
      apiError.internal({ message: MESSEGES.SERVER_ERROR }, "signin")
    );
  }
};

export const updateUserInfo = async (req, res, next) => {
  try {
    const validationResult = validateUserProfileUpdate(req.body);
    if (validationResult.error) {
      return next(apiError.badRequest(validationResult.msg));
    }
    const userId = req.userId;
    const user = await User.findById({ _id: userId });
    if (!user) {
      return next(apiError.notFound({ message: MESSEGES.USER_NOT_FOUND }));
    }
    const updateData = { ...req.body };
    const updatedUser = await updateUser(userId, updateData, {
      new: true,
    });
    if (!updatedUser) {
      return next(
        apiError.internal({ message: MESSEGES.USER_CREATION_FAILED })
      );
    }
    const userObj = updatedUser.toObject
      ? updatedUser.toObject({ getters: true })
      : updatedUser;
    delete userObj.password;
    delete userObj.confirmPassword;
    delete userObj.resetToken;
    delete userObj.resetTokenExpiry;
    delete userObj.emailVerificationToken;
    delete userObj.emailVerificationExpiry;

    res.status(200).json({
      message: "User updated successfully",
      data: userObj,
    });
  } catch (error) {
    console.error("Error updating user:", error);
    next(apiError.internal({ message: MESSEGES.SERVER_ERROR }));
  }
};

export const getUserById = async (req, res, next) => {
  try {
    const userId = req.params.id;
    if (!userId) {
      return next(apiError.badRequest(MESSEGES.USER_ID_REQUIRED));
    }
    const user = await findUserById(userId);
    if (!user) {
      return next(apiError.notFound(MESSEGES.USER_NOT_FOUND));
    }
    const userObj = user.toObject ? user.toObject({ getters: true }) : user;
    delete userObj.password;
    delete userObj.confirmPassword;
    delete userObj.resetToken;
    delete userObj.resetTokenExpiry;
    delete userObj.emailVerificationToken;
    delete userObj.emailVerificationExpiry;
    res.status(200).json({
      message: "User fetched successfully",
      data: userObj,
    });
  } catch (error) {
    console.error("Error fetching user by ID:", error);
    next(apiError.internal(MESSEGES.SERVER_ERROR));
  }
};

export const getUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const users = await getAllUsers({ skip, limit });
    const totalUsers = await User.countDocuments();
    const responseData = {
      users,
      page,
      limit,
      totalUsers,
      totalPages: Math.ceil(totalUsers / limit),
      hasMore: skip + users.length < totalUsers,
    };
    res
      .status(200)
      .json({ message: "Users fetched successfully", data: responseData });
  } catch (error) {
    console.error("Error fetching users:", error);
    next(apiError.internal(MESSEGES.SERVER_ERROR));
  }
};

export const updateProfilePicture = async (req, res, next) => {
  try {
    const userId = req.userId;
    const user = await User.findById({ _id: userId });
    if (!user) {
      return next(apiError.notFound(MESSEGES.USER_NOT_FOUND));
    }
    if (!req.file) {
      return next(apiError.badRequest({ message: "No file uploaded" }));
    }
    if (user.profilePicture && user.profilePicture.public_id) {
      try {
        await deleteImage(user.profilePicture.public_id);
      } catch (err) {
        console.error("Failed to delete old profile picture:", err);
      }
    }
    const uploaded = await uploadImage(req.file, {
      folder: "profile_pictures",
    });

    await User.findByIdAndUpdate(
      userId,
      {
        profilePicture: {
          url: uploaded.url,
          public_id: uploaded.public_id,
        },
      },
      { runValidators: false }
    );

    res.status(200).json({
      message: "Profile picture updated successfully",
      data: {
        url: uploaded.url,
        public_id: uploaded.public_id,
      },
    });
  } catch (error) {
    console.error("Error updating profile picture:", error);
    next(apiError.internal(MESSEGES.SERVER_ERROR));
  }
};

export const updateCoverImage = async (req, res, next) => {
  try {
    const userId = req.userId;
    const user = await User.findById({ _id: userId });
    if (!user) {
      return next(apiError.notFound(MESSEGES.USER_NOT_FOUND));
    }
    if (!req.file) {
      return next(apiError.badRequest("No file uploaded"));
    }
    if (user.coverImage && user.coverImage.public_id) {
      try {
        await deleteImage(user.coverImage.public_id);
      } catch (err) {
        console.error("Failed to delete old cover image:", err);
      }
    }
    const uploaded = await uploadImage(req.file, { folder: "cover_images" });

    await User.findByIdAndUpdate(
      userId,
      {
        coverImage: {
          url: uploaded.url,
          public_id: uploaded.public_id,
        },
      },
      { runValidators: false }
    );

    res.status(200).json({
      message: "Cover image updated successfully",
      data: {
        url: uploaded.url,
        public_id: uploaded.public_id,
      },
    });
  } catch (error) {
    console.error("Error updating cover image:", error);
    next(apiError.internal(MESSEGES.SERVER_ERROR));
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const validationResult = validateForgotPasswordInput(req.body);
    if (validationResult.error) {
      return next(apiError.badRequest(validationResult.msg));
    }

    const { email } = req.body;

    const result = await initiatePasswordReset(email);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error("Error in forgot password:", error);
    if (error.message === "User with this email does not exist") {
      return next(apiError.notFound(error.message));
    }
    next(apiError.internal("Failed to send password reset code"));
  }
};

export const verifyPasswordResetCode = async (req, res, next) => {
  try {
    const validationResult = validateResetCodeInput(req.body);
    if (validationResult.error) {
      return next(apiError.badRequest(validationResult.msg));
    }

    const { email, code } = req.body;

    const result = await verifyResetCode(email, code);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error("Error verifying reset code:", error);
    if (
      error.message.includes("does not exist") ||
      error.message.includes("expired") ||
      error.message.includes("Invalid")
    ) {
      return next(apiError.badRequest(error.message));
    }
    next(apiError.internal("Failed to verify reset code"));
  }
};

export const resetUserPassword = async (req, res, next) => {
  try {
    const validationResult = validatePasswordResetInput(req.body);
    if (validationResult.error) {
      return next(apiError.badRequest(validationResult.msg));
    }

    const { email, code, newPassword } = req.body;

    const result = await resetPassword(email, code, newPassword);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error("Error resetting password:", error);
    if (
      error.message.includes("Invalid") ||
      error.message.includes("expired") ||
      error.message.includes("does not exist")
    ) {
      return next(apiError.badRequest(error.message));
    }
    next(apiError.internal("Failed to reset password"));
  }
};

export const verifyEmail = async (req, res, next) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return next(
        apiError.badRequest("Email and verification code are required")
      );
    }

    const user = await User.findOne({
      email: email,
      emailVerificationToken: code,
    });

    if (!user) {
      return next(apiError.badRequest(MESSEGES.INVALID_VERIFICATION_TOKEN));
    }

    if (user.isEmailVerified) {
      return next(apiError.badRequest(MESSEGES.EMAIL_ALREADY_VERIFIED));
    }

    if (isVerificationTokenExpired(user.emailVerificationExpiry)) {
      return next(apiError.badRequest(MESSEGES.INVALID_VERIFICATION_TOKEN));
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = "";
    user.emailVerificationExpiry = null;
    await user.save();

    res.status(200).json({
      success: true,
      message: MESSEGES.EMAIL_VERIFIED_SUCCESS,
    });
  } catch (error) {
    console.error("Error verifying email:", error);
    next(apiError.internal(MESSEGES.SERVER_ERROR));
  }
};

export const resendVerificationEmail = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return next(apiError.badRequest("Email is required"));
    }

    const user = await User.findOne({ email });

    if (!user) {
      return next(apiError.badRequest(MESSEGES.USER_DOES_NOT_EXIST));
    }

    if (user.isEmailVerified) {
      return next(apiError.badRequest(MESSEGES.EMAIL_ALREADY_VERIFIED));
    }

    const verificationCode = generateVerificationCode();
    const verificationExpiry = new Date();
    verificationExpiry.setMinutes(verificationExpiry.getMinutes() + 15);

    user.emailVerificationToken = verificationCode;
    user.emailVerificationExpiry = verificationExpiry;
    await user.save();

    // Send the verification email in the background
    sendEmailVerification(email, verificationCode, user.firstName)
      .then((result) => {
        if (!result || !result.success) {
          console.warn("sendEmailVerification returned non-success result:", result);
        }
      })
      .catch((emailError) => {
        console.error("Background email sending failed:", emailError);
      });

    res.status(200).json({
      success: true,
      message: MESSEGES.VERIFICATION_EMAIL_RESENT,
    });
  } catch (error) {
    console.error("Error resending verification email:", error);
    next(apiError.internal(MESSEGES.SERVER_ERROR));
  }
};

export const getUserStatistics = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const stats = await getUserStats(userId);

    res.status(200).json({
      success: true,
      message: "User statistics retrieved successfully",
      data: stats,
    });
  } catch (error) {
    console.error("Error getting user statistics:", error);
    next(apiError.internal("Failed to get user statistics"));
  }
};

export const getUserStatisticsById = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const user = await findUserById(userId);
    if (!user) {
      return next(apiError.notFound("User not found"));
    }

    const stats = await getUserStats(userId);

    res.status(200).json({
      success: true,
      message: "User statistics retrieved successfully",
      data: stats,
    });
  } catch (error) {
    console.error("Error getting user statistics:", error);
    next(apiError.internal("Failed to get user statistics"));
  }
};

export const searchUsers = async (req, res, next) => {
  try {
    const {
      q: searchTerm = "",
      page = 1,
      limit = 10,
      relationship = "all",
    } = req.query;

    const currentUserId = req.userId;

    const validRelationships = [
      "all",
      "friends",
      "request_sent",
      "request_received",
      "none",
    ];
    if (!validRelationships.includes(relationship)) {
      return next(
        api.badRequest({
          message: `Invalid relationship filter. Must be one of: ${validRelationships.join(
            ", "
          )}`,
        })
      );
    }

    const result = await searchUsersWithRelationship({
      searchTerm,
      currentUserId,
      page: parseInt(page),
      limit: parseInt(limit),
      relationshipFilter: relationship,
    });

    res.status(200).json({
      message: "Users searched successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error searching users:", error);
    next(api.internal("Failed to search users"));
  }
};

export const changeUserPassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user._id;

    const validationResult = validateChangePasswordInput(req.body);
    if (validationResult.error) {
      return next(apiError.badRequest(validationResult.msg));
    }

    const result = await changePassword(userId, currentPassword, newPassword);

    res.status(200).json({
      message: result.message,
      success: result.success,
    });
  } catch (error) {
    console.error("Error changing password:", error);

    if (error.message === "User not found") {
      return next(apiError.notFound("User not found"));
    }
    if (error.message === "Current password is incorrect") {
      return next(apiError.badRequest("Current password is incorrect"));
    }
    if (
      error.message === "New password must be different from current password"
    ) {
      return next(
        apiError.badRequest(
          "New password must be different from current password"
        )
      );
    }

    next(apiError.internal("Failed to change password"));
  }
};

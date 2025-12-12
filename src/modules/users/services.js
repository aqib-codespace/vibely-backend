import User from "./model.js";
import { GetAcceptedFriendsList } from "../friend-requests/services.js";
import {
  searchMessagesInChatService,
  findOneOnOneChat,
} from "../chat/services.js";
import {
  sendPasswordResetEmail,
  generateResetCode,
  isResetCodeExpired,
} from "../../utils/emailService.js";
import FriendRequests from "../friend-requests/model.js";
import Feed from "../feed/model.js";
import { FRIEND_REQUEST_STATUS } from "../../constants/enums.js";

export const createUser = async (userData) => {
  return await User.create(userData);
};

export const getAllUsers = async ({ skip = 0, limit = 10 } = {}) => {
  return await User.find({})
    .select("-password")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

export const findUserByEmail = async (email) => {
  try {
    return await User.find({ email });
  } catch (error) {
    console.error("Error finding user by email:", error);
    throw error;
  }
};

export const findUserById = async (userId) => {
  try {
    return await User.findById(userId);
  } catch (error) {
    console.error("Error finding user by ID:", error);
    throw error;
  }
};

export const updateUser = async (userId, updateData) => {
  try {
    return await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true,
    });
  } catch (error) {
    console.error("Error updating user:", error);
    throw error;
  }
};

export const initiatePasswordReset = async (email) => {
  try {
    const user = await User.findOne({ email });
    if (!user) {
      throw new Error("User with this email does not exist");
    }
    const resetCode = generateResetCode();
    const expiryTime = new Date();
    expiryTime.setMinutes(expiryTime.getMinutes() + 15);
    await User.findByIdAndUpdate(user._id, {
      resetToken: resetCode,
      resetTokenExpiry: expiryTime,
    });
    // Send password reset email asynchronously so the request doesn't block on SMTP issues
    sendPasswordResetEmail(email, resetCode, user.firstName)
      .then((result) => {
        if (!result || !result.success) {
          console.warn("sendPasswordResetEmail returned non-success result:", result);
        }
      })
      .catch((err) => {
        console.error("Background sendPasswordResetEmail failed:", err);
      });

    return {
      success: true,
      message: "Password reset code sent to your email",
    };
  } catch (error) {
    console.error("Error initiating password reset:", error);
    throw error;
  }
};

export const verifyResetCode = async (email, code) => {
  try {
    const user = await User.findOne({ email });
    if (!user) {
      throw new Error("User with this email does not exist");
    }

    if (!user.resetToken || !user.resetTokenExpiry) {
      throw new Error("No password reset request found for this email");
    }
    if (isResetCodeExpired(user.resetTokenExpiry)) {
      await User.findByIdAndUpdate(user._id, {
        resetToken: "",
        resetTokenExpiry: null,
      });
      throw new Error("Reset code has expired. Please request a new one");
    }
    if (user.resetToken !== code) {
      throw new Error("Invalid reset code");
    }

    return {
      success: true,
      message: "Reset code verified successfully",
      userId: user._id,
    };
  } catch (error) {
    console.error("Error verifying reset code:", error);
    throw error;
  }
};

export const resetPassword = async (email, code, newPassword) => {
  try {
    const verificationResult = await verifyResetCode(email, code);

    if (!verificationResult.success) {
      throw new Error("Invalid or expired reset code");
    }

    const user = await User.findById(verificationResult.userId);
    if (!user) {
      throw new Error("User not found");
    }

    user.password = newPassword;
    user.resetToken = "";
    user.resetTokenExpiry = null;

    await user.save();

    return {
      success: true,
      message: "Password reset successfully",
    };
  } catch (error) {
    console.error("Error resetting password:", error);
    throw error;
  }
};

export const getUserStats = async (userId) => {
  try {
    const friendsCount = await FriendRequests.countDocuments({
      $or: [
        { senderId: userId, status: FRIEND_REQUEST_STATUS.Accepted },
        { receiverId: userId, status: FRIEND_REQUEST_STATUS.Accepted },
      ],
    });

    const postsCount = await Feed.countDocuments({ user: userId });

    const userPosts = await Feed.find({ user: userId }).select("likes");
    const likesCount = userPosts.reduce(
      (total, post) => total + post.likes.length,
      0
    );

    return {
      friendsCount,
      postsCount,
      likesCount,
    };
  } catch (error) {
    console.error("Error getting user stats:", error);
    throw error;
  }
};

export const changePassword = async (userId, currentPassword, newPassword) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const isCurrentPasswordValid = await user.checkPassword(currentPassword);
    if (!isCurrentPasswordValid) {
      throw new Error("Current password is incorrect");
    }

    const isSamePassword = await user.checkPassword(newPassword);
    if (isSamePassword) {
      throw new Error("New password must be different from current password");
    }

    user.password = newPassword;
    await user.save();

    return {
      success: true,
      message: "Password changed successfully",
    };
  } catch (error) {
    console.error("Error changing password:", error);
    throw error;
  }
};

export const searchUsersWithRelationship = async ({
  searchTerm = "",
  currentUserId,
  page = 1,
  limit = 10,
  relationshipFilter = "all",
}) => {
  try {
    const skip = (page - 1) * limit;

    const searchQuery = {
      _id: { $ne: currentUserId },
    };

    if (searchTerm.trim()) {
      searchQuery.$or = [
        { firstName: { $regex: searchTerm, $options: "i" } },
        { lastName: { $regex: searchTerm, $options: "i" } },
        { username: { $regex: searchTerm, $options: "i" } },
      ];
    }

    const users = await User.find(searchQuery)
      .select("firstName lastName username profilePicture email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const friendRequests = await FriendRequests.find({
      $or: [{ senderId: currentUserId }, { receiverId: currentUserId }],
    });

    const relationshipMap = {};
    friendRequests.forEach((request) => {
      const otherUserId =
        request.senderId.toString() === currentUserId.toString()
          ? request.receiverId.toString()
          : request.senderId.toString();

      if (request.status === FRIEND_REQUEST_STATUS.Accepted) {
        relationshipMap[otherUserId] = "friend";
      } else if (request.status === FRIEND_REQUEST_STATUS.Pending) {
        if (request.senderId.toString() === currentUserId.toString()) {
          relationshipMap[otherUserId] = "request_sent";
        } else {
          relationshipMap[otherUserId] = "request_received";
        }
      }
    });

    const usersWithRelationship = users.map((user) => {
      const userId = user._id.toString();
      const relationship = relationshipMap[userId] || "none";

      return {
        ...user.toObject(),
        relationshipStatus: relationship,
      };
    });

    let filteredUsers = usersWithRelationship;
    if (relationshipFilter !== "all") {
      filteredUsers = usersWithRelationship.filter(
        (user) => user.relationshipStatus === relationshipFilter
      );
    }

    const totalUsers = await User.countDocuments(searchQuery);

    return {
      users: filteredUsers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalUsers,
        totalPages: Math.ceil(totalUsers / limit),
        hasMore: skip + users.length < totalUsers,
      },
    };
  } catch (error) {
    console.error("Error searching users with relationship:", error);
    throw error;
  }
};

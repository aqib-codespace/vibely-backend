import FriendRequests from "./model.js";
import { FRIEND_REQUEST_STATUS } from "../../constants/enums.js";
import apiError from "../../utils/apiError.js";
import { MESSEGES } from "../../constants/messages.js";
import { User } from "../users/model.js";
import { createNotification } from "../notifications/services.js";
import { NOTIFICATION_TYPE } from "../../constants/notification-enums.js";

export const SendFriendRequest = async ({ senderId, receiverId }) => {
  const [sender, receiver] = await Promise.all([
    User.findById(senderId),
    User.findById(receiverId),
  ]);

  if (!sender || !receiver) {
    throw apiError.notFound({ message: MESSEGES.USER_NOT_FOUND });
  }

  const existing = await FriendRequests.findOne({
    senderId,
    receiverId,
    status: FRIEND_REQUEST_STATUS.Pending,
  });

  if (existing) {
    throw apiError.badRequest({
      message: MESSEGES.FRIEND_REQUEST_ALREADY_SENT,
    });
  }

  const friendRequest = await FriendRequests.create({
    senderId,
    receiverId,
    status: FRIEND_REQUEST_STATUS.Pending,
  });

  // Send notification
  try {
    await createNotification({
      recipient: receiverId,
      sender: senderId,
      type: NOTIFICATION_TYPE.FRIEND_REQUEST,
      message: `${sender.firstName} ${sender.lastName} sent you a friend request`,
      relatedId: friendRequest._id,
    });
  } catch (error) {
    console.error("Failed to create notification:", error);
  }

  return friendRequest;
};

export const UpdateFriendRequestStatus = async ({
  requestId,
  status,
  userId,
}) => {
  const friendRequest = await FriendRequests.findById(requestId);

  if (!friendRequest) return null;

  if (friendRequest.receiverId.toString() !== userId.toString()) {
    throw apiError.forbidden({ message: MESSEGES.UNAUTHORIZED_ACTION });
  }

  const oldStatus = friendRequest.status;
  friendRequest.status = status;
  await friendRequest.save();

  if (
    status === FRIEND_REQUEST_STATUS.Accepted &&
    oldStatus !== FRIEND_REQUEST_STATUS.Accepted
  ) {
    try {
      const receiver = await User.findById(userId);
      if (receiver) {
        await createNotification({
          recipient: friendRequest.senderId,
          sender: userId,
          type: NOTIFICATION_TYPE.FRIEND_ACCEPTED,
          message: `${receiver.firstName} ${receiver.lastName} accepted your friend request`,
          relatedId: requestId,
        });
      }
    } catch (error) {
      console.error("Failed to create notification:", error);
    }
  }

  return friendRequest.populate(
    "senderId receiverId",
    "username firstName lastName profilePicture"
  );
};

export const DeleteFriendRequest = async ({ requestId, userId }) => {
  const friendRequest = await FriendRequests.findById(requestId);

  if (!friendRequest) return null;

  if (friendRequest.senderId.toString() !== userId.toString()) {
    throw apiError.forbidden({ message: MESSEGES.UNAUTHORIZED_ACTION });
  }

  if (friendRequest.status !== FRIEND_REQUEST_STATUS.Pending) {
    throw apiError.badRequest({
      message: MESSEGES.CANNOT_CANCEL_NON_PENDING_REQUEST,
    });
  }

  await FriendRequests.findByIdAndDelete(requestId);
  return true;
};

export const GetFriendRequests = async ({
  userId,
  page = 1,
  limit = 10,
  type = "all",
}) => {
  const skip = (page - 1) * limit;
  let query = {};

  if (type === "sent") {
    query = { senderId: userId, status: FRIEND_REQUEST_STATUS.Pending };
  } else if (type === "received") {
    query = { receiverId: userId, status: FRIEND_REQUEST_STATUS.Pending };
  } else {
    query = { $or: [{ senderId: userId }, { receiverId: userId }] };
  }

  const requests = await FriendRequests.find(query)
    .populate("senderId", "username firstName lastName profilePicture")
    .populate("receiverId", "username firstName lastName profilePicture")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  return {
    requests,
    hasMore: requests.length === limit,
  };
};

export const GetAcceptedFriendsList = async ({
  userId,
  page = 1,
  limit = 10,
  search = "",
}) => {
  const skip = (page - 1) * limit;

  const query = {
    $or: [{ senderId: userId }, { receiverId: userId }],
    status: FRIEND_REQUEST_STATUS.Accepted,
  };

  const friendRequests = await FriendRequests.find(query)
    .populate("senderId", "username firstName lastName profilePicture")
    .populate("receiverId", "username firstName lastName profilePicture")
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(limit);

  const validFriendRequests = friendRequests.filter(
    (req) => req.senderId && req.receiverId
  );

  const friends = validFriendRequests.map((req) =>
    req.senderId._id.toString() === userId.toString()
      ? req.receiverId
      : req.senderId
  );

  const filtered = search
    ? friends.filter((f) => {
        const searchLower = search.toLowerCase();
        return (
          (f.firstName && f.firstName.toLowerCase().includes(searchLower)) ||
          (f.lastName && f.lastName.toLowerCase().includes(searchLower)) ||
          (f.username && f.username.toLowerCase().includes(searchLower))
        );
      })
    : friends;

  return filtered;
};

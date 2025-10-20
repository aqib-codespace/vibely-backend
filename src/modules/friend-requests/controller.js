import {
  SendFriendRequest,
  UpdateFriendRequestStatus,
  DeleteFriendRequest,
  GetFriendRequests,
  GetAcceptedFriendsList,
} from "./services.js";
import apiError from "../../utils/apiError.js";
import { MESSEGES } from "../../constants/messages.js";

export const sendFriendRequest = async (req, res, next) => {
  try {
    const { receiverId } = req.body;
    const senderId = req.userId;

    if (senderId === receiverId) {
      return next(
        apiError.badRequest({ message: MESSEGES.CANNOT_SEND_REQUEST_TO_SELF })
      );
    }

    const newRequest = await SendFriendRequest({ senderId, receiverId });
    res
      .status(201)
      .json({ message: MESSEGES.FRIEND_REQUEST_SENT, request: newRequest });
  } catch (error) {
    console.error("Send Friend Request Error:", error);
    next(apiError.internal({ message: MESSEGES.SERVER_ERROR }));
  }
};

export const updateFriendRequest = async (req, res, next) => {
  try {
    const { status } = req.body;
    const { requestId } = req.params;
    const userId = req.userId;

    const updatedRequest = await UpdateFriendRequestStatus({
      requestId,
      status,
      userId,
    });
    if (!updatedRequest) {
      return next(
        apiError.notFound({ message: MESSEGES.FRIEND_REQUEST_NOT_FOUND })
      );
    }

    res.status(200).json({
      message:
        status === "accepted"
          ? MESSEGES.FRIEND_REQUEST_ACCEPTED
          : MESSEGES.FRIEND_REQUEST_REJECTED,
      request: updatedRequest,
    });
  } catch (error) {
    console.error("Update Friend Request Error:", error);
    next(apiError.internal({ message: MESSEGES.SERVER_ERROR }));
  }
};

export const deleteFriendRequest = async (req, res, next) => {
  try {
    const { requestId } = req.params;
    const userId = req.userId;

    const deleted = await DeleteFriendRequest({ requestId, userId });
    if (!deleted) {
      return next(
        apiError.notFound({ message: MESSEGES.FRIEND_REQUEST_NOT_FOUND })
      );
    }

    res.status(200).json({ message: MESSEGES.FRIEND_REQUEST_CANCELLED });
  } catch (error) {
    console.error("Delete Friend Request Error:", error);
    next(apiError.internal({ message: MESSEGES.SERVER_ERROR }));
  }
};

export const getFriendRequests = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, type } = req.query;
    const userId = req.userId;

    const { requests, hasMore } = await GetFriendRequests({
      userId,
      page,
      limit,
      type,
    });

    res.status(200).json({
      requests,
      pagination: { page, limit, hasMore },
    });
  } catch (error) {
    console.error("Get Friend Requests Error:", error);
    next(apiError.internal({ message: MESSEGES.SERVER_ERROR }));
  }
};

export const getFriends = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;
    const userId = req.userId;

    const friends = await GetAcceptedFriendsList({
      userId,
      page,
      limit,
      search,
    });

    res.status(200).json({
      friends,
      pagination: { page, limit, hasMore: friends.length === limit },
    });
  } catch (error) {
    console.error("Get Friends Error:", error);
    next(apiError.internal({ message: MESSEGES.SERVER_ERROR }));
  }
};

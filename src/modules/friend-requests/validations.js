import joi from "joi";
import { MESSEGES } from "../../constants/messages.js";

export const validateSendFriendRequestInputs = (data) => {
  const Schema = joi.object({
    senderId: joi.string().required().messages({
      "string.empty": MESSEGES.SENDER_ID_REQUIRED,
      "any.required": MESSEGES.SENDER_ID_REQUIRED,
    }),
    receiverId: joi.string().required().messages({
      "string.empty": MESSEGES.RECEIVER_ID_REQUIRED,
      "any.required": MESSEGES.RECEIVER_ID_REQUIRED,
    }),
  });

  const result = Schema.validate(data);
  return {
    error: result?.error,
    msg: result?.error?.details[0]?.message,
  };
};

export const validateFriendRequestQueryParams = (data) => {
  const Schema = joi.object({
    page: joi.number().integer().min(1).default(1).messages({
      "number.base": "Page must be a number",
      "number.min": "Page must be at least 1",
    }),
    limit: joi.number().integer().min(1).max(100).default(10).messages({
      "number.base": "Limit must be a number",
      "number.min": "Limit must be at least 1",
      "number.max": "Limit must be at most 100",
    }),
    search: joi.string().trim().allow("").optional().messages({
      "string.base": "Search must be a string",
    }),
  });
  const result = Schema.validate(data);
  return {
    error: result?.error,
    msg: result?.error?.details[0]?.message,
    value: result?.value,
  };
};

export const validateAcceptFriendRequestInputs = (data) => {
  const Schema = joi.object({
    requestId: joi.string().required().messages({
      "string.empty": MESSEGES.REQUEST_ID_REQUIRED,
      "any.required": MESSEGES.REQUEST_ID_REQUIRED,
    }),
    userId: joi.string().required().messages({
      "string.empty": MESSEGES.USER_ID_REQUIRED,
      "any.required": MESSEGES.USER_ID_REQUIRED,
    }),
  });
  const result = Schema.validate(data);
  return {
    error: result?.error,
    msg: result?.error?.details[0]?.message,
  };
};

import Joi from "joi";

export const validateCreateChat = (data) => {
  const Schema = Joi.object({
    userId: Joi.string().required().messages({
      "string.empty": "User ID is required",
      "any.required": "User ID is required",
    }),
  });

  const result = Schema.validate(data);
  return {
    error: result?.error,
    msg: result?.error?.details[0]?.message,
  };
};

export const validateCreateGroupChat = (data) => {
  const Schema = Joi.object({
    users: Joi.array().items(Joi.string()).min(2).required().messages({
      "array.min": "Group chat must have at least 2 users",
      "any.required": "Users are required",
    }),
    chatName: Joi.string().required().messages({
      "string.empty": "Chat name is required",
      "any.required": "Chat name is required",
    }),
  });

  const result = Schema.validate(data);
  return {
    error: result?.error,
    msg: result?.error?.details[0]?.message,
  };
};

export const validateSendMessage = (data) => {
  const Schema = Joi.object({
    content: Joi.string().max(2000).required().messages({
      "string.empty": "Message content is required",
      "any.required": "Message content is required",
      "string.max": "Message content cannot exceed 2000 characters",
    }),
    chatId: Joi.string().required().messages({
      "string.empty": "Chat ID is required",
      "any.required": "Chat ID is required",
    }),
    replyTo: Joi.string().allow(null, "").optional().messages({
      "string.base": "Reply to message ID must be a string",
    }),
    productId: Joi.string().allow(null, "").optional().messages({
      "string.base": "Product ID must be a string",
    }),
    productData: Joi.alternatives()
      .try(Joi.object(), Joi.string())
      .allow(null, "")
      .optional()
      .messages({
        "alternatives.match":
          "Product data must be a valid object or JSON string",
      }),
  });

  const result = Schema.validate(data);
  return {
    error: result?.error,
    msg: result?.error?.details[0]?.message,
  };
};

export const validateMessageReaction = (data) => {
  const Schema = Joi.object({
    emoji: Joi.string().required().messages({
      "string.empty": "Emoji is required",
      "any.required": "Emoji is required",
    }),
  });

  const result = Schema.validate(data);
  return {
    error: result?.error,
    msg: result?.error?.details[0]?.message,
  };
};

export const validateGlobalSearch = (data) => {
  const Schema = Joi.object({
    query: Joi.string().min(1).max(100).required().messages({
      "string.empty": "Search query is required",
      "string.min": "Search query must be at least 1 characters long",
      "string.max": "Search query cannot exceed 100 characters",
      "any.required": "Search query is required",
    }),
    page: Joi.number().integer().min(1).optional().messages({
      "number.base": "Page must be a number",
      "number.integer": "Page must be an integer",
      "number.min": "Page must be at least 1",
    }),
    limit: Joi.number().integer().min(1).max(50).optional().messages({
      "number.base": "Limit must be a number",
      "number.integer": "Limit must be an integer",
      "number.min": "Limit must be at least 1",
      "number.max": "Limit cannot exceed 50",
    }),
  });

  const result = Schema.validate(data);
  return {
    error: result?.error,
    msg: result?.error?.details[0]?.message,
  };
};

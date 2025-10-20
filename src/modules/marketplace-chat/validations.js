import Joi from "joi";

export const validateCreateMarketplaceChat = (data) => {
  const schema = Joi.object({
    sellerId: Joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .required()
      .messages({
        "string.pattern.base": "Invalid seller ID format",
        "any.required": "Seller ID is required",
      }),
    productId: Joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .required()
      .messages({
        "string.pattern.base": "Invalid product ID format",
        "any.required": "Product ID is required",
      }),
  });

  const { error } = schema.validate(data);
  if (error) {
    return {
      error: true,
      msg: error.details[0].message,
    };
  }
  return { error: false };
};

export const validateSendMarketplaceMessage = (data) => {
  const schema = Joi.object({
    chatId: Joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .required()
      .messages({
        "string.pattern.base": "Invalid chat ID format",
        "any.required": "Chat ID is required",
      }),
    content: Joi.string().min(1).max(2000).required().messages({
      "string.min": "Message content cannot be empty",
      "string.max": "Message content cannot exceed 2000 characters",
      "any.required": "Message content is required",
    }),
    messageType: Joi.string()
      .valid("text", "image", "product_share", "offer")
      .default("text"),
    replyTo: Joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .optional()
      .messages({
        "string.pattern.base": "Invalid reply message ID format",
      }),
    sharedProduct: Joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .optional()
      .messages({
        "string.pattern.base": "Invalid shared product ID format",
      }),
    offerDetails: Joi.object({
      amount: Joi.number().positive().required(),
      currency: Joi.string().length(3).default("USD"),
      expiresAt: Joi.date().greater("now").optional(),
    }).optional(),
  });

  const { error } = schema.validate(data);
  if (error) {
    return {
      error: true,
      msg: error.details[0].message,
    };
  }
  return { error: false };
};

export const validateGetMessages = (data) => {
  const schema = Joi.object({
    chatId: Joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .required()
      .messages({
        "string.pattern.base": "Invalid chat ID format",
        "any.required": "Chat ID is required",
      }),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(50),
  });

  const { error } = schema.validate(data);
  if (error) {
    return {
      error: true,
      msg: error.details[0].message,
    };
  }
  return { error: false };
};

export const validateMarketplaceMessageReaction = (data) => {
  const schema = Joi.object({
    messageId: Joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .required()
      .messages({
        "string.pattern.base": "Invalid message ID format",
        "any.required": "Message ID is required",
      }),
    emoji: Joi.string()
      .valid("👍", "❤️", "😂", "😮", "😢", "😡")
      .required()
      .messages({
        "any.only": "Invalid emoji reaction",
        "any.required": "Emoji is required",
      }),
  });

  const { error } = schema.validate(data);
  if (error) {
    return {
      error: true,
      msg: error.details[0].message,
    };
  }
  return { error: false };
};

export const validateEditMarketplaceMessage = (data) => {
  const schema = Joi.object({
    messageId: Joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .required()
      .messages({
        "string.pattern.base": "Invalid message ID format",
        "any.required": "Message ID is required",
      }),
    content: Joi.string().min(1).max(2000).required().messages({
      "string.min": "Message content cannot be empty",
      "string.max": "Message content cannot exceed 2000 characters",
      "any.required": "Message content is required",
    }),
  });

  const { error } = schema.validate(data);
  if (error) {
    return {
      error: true,
      msg: error.details[0].message,
    };
  }
  return { error: false };
};

export const validateDeleteMarketplaceMessage = (data) => {
  const schema = Joi.object({
    messageId: Joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .required()
      .messages({
        "string.pattern.base": "Invalid message ID format",
        "any.required": "Message ID is required",
      }),
    deleteType: Joi.string().valid("forMe", "forEveryone").default("forMe"),
  });

  const { error } = schema.validate(data);
  if (error) {
    return {
      error: true,
      msg: error.details[0].message,
    };
  }
  return { error: false };
};

export const validateSearchMarketplaceMessages = (data) => {
  const schema = Joi.object({
    chatId: Joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .required()
      .messages({
        "string.pattern.base": "Invalid chat ID format",
        "any.required": "Chat ID is required",
      }),
    query: Joi.string().min(1).max(100).required().messages({
      "string.min": "Search query cannot be empty",
      "string.max": "Search query cannot exceed 100 characters",
      "any.required": "Search query is required",
    }),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20),
  });

  const { error } = schema.validate(data);
  if (error) {
    return {
      error: true,
      msg: error.details[0].message,
    };
  }
  return { error: false };
};

export const validateBlockUser = (data) => {
  const schema = Joi.object({
    chatId: Joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .required()
      .messages({
        "string.pattern.base": "Invalid chat ID format",
        "any.required": "Chat ID is required",
      }),
    targetUserId: Joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .required()
      .messages({
        "string.pattern.base": "Invalid user ID format",
        "any.required": "Target user ID is required",
      }),
  });

  const { error } = schema.validate(data);
  if (error) {
    return {
      error: true,
      msg: error.details[0].message,
    };
  }
  return { error: false };
};

export const validateArchiveChat = (data) => {
  const schema = Joi.object({
    chatId: Joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .required()
      .messages({
        "string.pattern.base": "Invalid chat ID format",
        "any.required": "Chat ID is required",
      }),
  });

  const { error } = schema.validate(data);
  if (error) {
    return {
      error: true,
      msg: error.details[0].message,
    };
  }
  return { error: false };
};

export const validateGetMarketplaceChats = (data) => {
  const schema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20),
  });

  const { error } = schema.validate(data);
  if (error) {
    return {
      error: true,
      msg: error.details[0].message,
    };
  }
  return { error: false };
};

import Joi from "joi";

export const validateStartChat = (data) => {
  const schema = Joi.object({
    productId: Joi.string().required().messages({
      "string.empty": "Product ID is required",
      "any.required": "Product ID is required",
    }),
  });

  const { error } = schema.validate(data);
  if (error) {
    return { error: true, msg: error.details[0].message };
  }
  return { error: false };
};

export const validateSendMessage = (data) => {
  const schema = Joi.object({
    content: Joi.string().required().trim().max(1000).messages({
      "string.empty": "Message content is required",
      "string.max": "Message cannot exceed 1000 characters",
      "any.required": "Message content is required",
    }),
    chatId: Joi.string().required().messages({
      "string.empty": "Chat ID is required",
      "any.required": "Chat ID is required",
    }),
  });

  const { error } = schema.validate(data);
  if (error) {
    return { error: true, msg: error.details[0].message };
  }
  return { error: false };
};

import Joi from "joi";
import { MESSEGES } from "../../constants/messages.js";

export const validateCreateFeed = (data) => {
  const Schema = Joi.object({
    content: Joi.string().max(5000).required().messages({
      "string.empty": MESSEGES.FEED_CONTENT_REQUIRED,
      "any.required": MESSEGES.FEED_CONTENT_REQUIRED,
    }),
    media: Joi.array()
      .items(
        Joi.object({
          url: Joi.string().uri().required(),
          public_id: Joi.string().required(),
          type: Joi.string().valid("image", "video").required(),
        })
      )
      .max(4)
      .messages({
        "array.max": MESSEGES.FEED_MEDIA_MAX,
      }),
  });

  const result = Schema.validate(data);
  return {
    error: result?.error,
    msg: result?.error?.details[0]?.message,
  };
};

export const validateFeedQueryParams = (data) => {
  const Schema = Joi.object({
    page: Joi.number().integer().min(1).default(1).messages({
      "number.base": "Page must be a number",
      "number.min": "Page must be at least 1",
    }),
    limit: Joi.number().integer().min(1).max(100).default(10).messages({
      "number.base": "Limit must be a number",
      "number.min": "Limit must be at least 1",
      "number.max": "Limit must be at most 100",
    }),
  });

  const result = Schema.validate(data);
  return {
    error: result?.error,
    msg: result?.error?.details[0]?.message,
    value: result?.value,
  };
};

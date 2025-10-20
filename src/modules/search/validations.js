import Joi from "joi";

export const globalSearchValidation = Joi.object({
  q: Joi.string().min(2).max(100).trim().required().messages({
    "string.empty": "Search query is required",
    "string.min": "Search query must be at least 2 characters long",
    "string.max": "Search query must not exceed 100 characters",
    "any.required": "Search query is required",
  }),

  type: Joi.string()
    .valid("all", "users", "feed", "marketplace", "videos", "messages")
    .default("all")
    .messages({
      "any.only":
        "Search type must be one of: all, users, feed, marketplace, videos, messages",
    }),

  page: Joi.number().integer().min(1).default(1).messages({
    "number.base": "Page must be a number",
    "number.integer": "Page must be an integer",
    "number.min": "Page must be at least 1",
  }),

  limit: Joi.number().integer().min(1).max(50).default(20).messages({
    "number.base": "Limit must be a number",
    "number.integer": "Limit must be an integer",
    "number.min": "Limit must be at least 1",
    "number.max": "Limit must not exceed 50",
  }),

  sortBy: Joi.string()
    .valid(
      "relevance",
      "recent",
      "popular",
      "most_liked",
      "price_low",
      "price_high"
    )
    .default("relevance")
    .messages({
      "any.only":
        "Sort by must be one of: relevance, recent, popular, most_liked, price_low, price_high",
    }),

  category: Joi.string()
    .valid(
      "mens_clothings_&_shoes",
      "womens_clothings_&_shoes",
      "electronics",
      "vehicles",
      "home_&_garden",
      "health_&_beauty",
      "baby_&_children",
      "sports_&_outdoors"
    )
    .optional()
    .messages({
      "any.only": "Invalid category",
    }),

  minPrice: Joi.number().min(0).optional().messages({
    "number.base": "Minimum price must be a number",
    "number.min": "Minimum price must be at least 0",
  }),

  maxPrice: Joi.number().min(0).optional().messages({
    "number.base": "Maximum price must be a number",
    "number.min": "Maximum price must be at least 0",
  }),
})
  .custom((value, helpers) => {
    if (value.minPrice && value.maxPrice && value.minPrice > value.maxPrice) {
      return helpers.error("custom.priceRange");
    }
    return value;
  })
  .messages({
    "custom.priceRange":
      "Minimum price must be less than or equal to maximum price",
  });

export const searchSuggestionsValidation = Joi.object({
  q: Joi.string().min(2).max(50).trim().required().messages({
    "string.empty": "Search query is required",
    "string.min": "Search query must be at least 2 characters long",
    "string.max": "Search query must not exceed 50 characters",
    "any.required": "Search query is required",
  }),

  limit: Joi.number().integer().min(1).max(10).default(5).messages({
    "number.base": "Limit must be a number",
    "number.integer": "Limit must be an integer",
    "number.min": "Limit must be at least 1",
    "number.max": "Limit must not exceed 10",
  }),
});

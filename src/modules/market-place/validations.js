import Joi from "joi";

export const validateMarketPlaceInputs = (data) => {
  const Schema = Joi.object({
    name: Joi.string().required().trim().min(1).messages({
      "string.empty": "Name is required",
      "any.required": "Name is required",
    }),
    description: Joi.string().required().trim().min(1).messages({
      "string.empty": "Description is required",
      "any.required": "Description is required",
    }),
    price: Joi.number().required().min(0).messages({
      "number.base": "Price must be a number",
      "number.min": "Price cannot be negative",
      "any.required": "Price is required",
    }),
    category: Joi.string().required().messages({
      "string.empty": "Category is required",
      "any.required": "Category is required",
    }),
    images: Joi.array()
      .items(
        Joi.object({
          url: Joi.string().required().messages({
            "string.empty": "Image URL is required",
            "any.required": "Image URL is required",
          }),
          public_id: Joi.string().required().messages({
            "string.empty": "Image public_id is required",
            "any.required": "Image public_id is required",
          }),
        })
      )
      .min(1)
      .required()
      .messages({
        "array.base": "Images must be an array",
        "array.min": "At least one image is required",
        "any.required": "Images are required",
      }),
  });
  const result = Schema.validate(data);
  return {
    error: result?.error,
    msg: result?.error?.details[0]?.message,
  };
};

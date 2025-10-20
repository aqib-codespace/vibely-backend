import Joi from "joi";

export const validateUploadVideo = (data) => {
  const Schema = Joi.object({
    // userId: Joi.string().required().messages({
    //   "string.empty": "User ID is required",
    //   "any.required": "User ID is required",
    // }),
    title: Joi.string().required().messages({
      "string.empty": "Title is required",
      "any.required": "Title is required",
    }),
    description: Joi.string().required().messages({
      "string.empty": "Description is required",
      "any.required": "Description is required",
    }),
  });
  const result = Schema.validate(data);
  return {
    error: result?.error,
    msg: result?.error?.details[0]?.message,
  };
};

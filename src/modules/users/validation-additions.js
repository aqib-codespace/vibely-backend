export const validateResetCodeInput = (data) => {
  const Schema = Joi.object({
    email: Joi.string().email().required().messages({
      "string.email": MESSEGES.EMAIL_INVALID,
      "any.required": MESSEGES.EMAIL_REQUIRED,
    }),
    code: Joi.string().length(6).pattern(/^\d+$/).required().messages({
      "string.length": "Verification code must be exactly 6 digits",
      "string.pattern.base": "Verification code must contain only numbers",
      "any.required": "Verification code is required",
    }),
  });

  const result = Schema.validate(data);
  return {
    error: result?.error,
    msg: result?.error?.details[0]?.message,
  };
};

export const validatePasswordResetInput = (data) => {
  const Schema = Joi.object({
    email: Joi.string().email().required().messages({
      "string.email": MESSEGES.EMAIL_INVALID,
      "any.required": MESSEGES.EMAIL_REQUIRED,
    }),
    code: Joi.string().length(6).pattern(/^\d+$/).required().messages({
      "string.length": "Verification code must be exactly 6 digits",
      "string.pattern.base": "Verification code must contain only numbers",
      "any.required": "Verification code is required",
    }),
    newPassword: Joi.string().min(8).max(30).required().messages({
      "string.min": MESSEGES.PASSWORD_MIN,
      "string.max": MESSEGES.PASSWORD_MAX,
      "any.required": "New password is required",
    }),
    confirmPassword: Joi.string()
      .valid(Joi.ref("newPassword"))
      .required()
      .messages({
        "any.only": MESSEGES.PASSWORDS_NOT_MATCH,
        "any.required": "Confirm password is required",
      }),
  });

  const result = Schema.validate(data);
  return {
    error: result?.error,
    msg: result?.error?.details[0]?.message,
  };
};

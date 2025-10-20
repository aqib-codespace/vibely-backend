import Joi from "joi";
import { MESSEGES } from "../../constants/messages.js";
import { USER_GENDER, USER_STATUS } from "../../constants/enums.js";

export const validateSignUpInputs = (data) => {
  const Schema = Joi.object({
    firstName: Joi.string().required().trim().min(1).messages({
      "string.empty": MESSEGES.FIRST_NAME_REQUIRED,
      "any.required": MESSEGES.FIRST_NAME_REQUIRED,
    }),
    lastName: Joi.string().required().trim().min(1).messages({
      "string.empty": MESSEGES.LAST_NAME_REQUIRED,
      "any.required": MESSEGES.LAST_NAME_REQUIRED,
    }),
    userName: Joi.string().alphanum().min(3).max(30).required().messages({
      "string.min": MESSEGES.USER_NAME_MIN,
      "string.max": MESSEGES.USER_NAME_MAX,
      "any.required": MESSEGES.USER_NAME_REQUIRED,
    }),
    email: Joi.string().email().required().messages({
      "string.email": MESSEGES.EMAIL_INVALID,
      "any.required": MESSEGES.EMAIL_REQUIRED,
    }),
    password: Joi.string().min(8).max(30).required().messages({
      "string.min": MESSEGES.PASSWORD_MIN,
      "string.max": MESSEGES.PASSWORD_MAX,
      "any.required": MESSEGES.PASSWORD_REQUIRED,
    }),
    confirmPassword: Joi.string()
      .valid(Joi.ref("password"))
      .required()
      .messages({
        "any.only": MESSEGES.PASSWORDS_NOT_MATCH,
        "any.required": MESSEGES.CONFIRM_PASSWORD_REQUIRED,
      }),
    address: Joi.string().min(5).max(100).optional().messages({
      "string.min": "Address must be at least 5 characters.",
      "string.max": MESSEGES.ADDRESS_MAX_LENGTH,
    }),
    gender: Joi.string()
      .valid(...Object.values(USER_GENDER))
      .optional()
      .messages({
        "any.only":
          "Gender must be one of: " + Object.values(USER_GENDER).join(", "),
      }),
    status: Joi.string()
      .valid(...Object.values(USER_STATUS))
      .optional()
      .messages({
        "any.only":
          "Status must be one of: " + Object.values(USER_STATUS).join(", "),
      }),
    dateOfBirth: Joi.date()
      .less("now")
      .optional()
      .messages({
        "date.less":
          MESSEGES.DOB_IN_FUTURE || "Date of birth must be in the past.",
        "any.required": "Date of birth is required.",
        "date.base":
          MESSEGES.DOB_INVALID || "Date of birth must be a valid date.",
      }),
  });

  const result = Schema.validate(data);
  return {
    error: result?.error,
    msg: result?.error?.details[0]?.message,
  };
};

export const validateSignInInputs = (data) => {
  const Schema = Joi.object({
    email: Joi.string().email().required().messages({
      "string.email": MESSEGES.EMAIL_INVALID,
      "any.required": MESSEGES.EMAIL_REQUIRED,
    }),
    password: Joi.string().required().messages({
      "string.empty": MESSEGES.PASSWORD_REQUIRED,
      "any.required": MESSEGES.PASSWORD_REQUIRED,
    }),
  });

  const result = Schema.validate(data);
  return {
    error: result?.error,
    msg: result?.error?.details[0]?.message,
  };
};

export const validateUserProfileUpdate = (data) => {
  const Schema = Joi.object({
    firstName: Joi.string().optional().trim().min(1).messages({
      "string.empty": MESSEGES.FIRST_NAME_REQUIRED,
      "any.required": MESSEGES.FIRST_NAME_REQUIRED,
    }),
    lastName: Joi.string().optional().trim().min(1).messages({
      "string.empty": MESSEGES.LAST_NAME_REQUIRED,
      "any.required": MESSEGES.LAST_NAME_REQUIRED,
    }),
    userName: Joi.string().alphanum().min(3).max(30).optional().messages({
      "string.min": MESSEGES.USER_NAME_MIN,
      "string.max": MESSEGES.USER_NAME_MAX,
      "any.required": MESSEGES.USER_NAME_REQUIRED,
    }),
    email: Joi.string().email().optional().messages({
      "string.email": MESSEGES.EMAIL_INVALID,
      "any.required": MESSEGES.EMAIL_REQUIRED,
    }),
    bio: Joi.string().optional().max(160).messages({
      "string.max": MESSEGES.BIO_MAX_LENGTH,
    }),
    address: Joi.string().min(5).max(100).optional().messages({
      "string.min": "Address must be at least 5 characters.",
      "string.max": MESSEGES.ADDRESS_MAX_LENGTH,
    }),
    gender: Joi.string()
      .valid(...Object.values(USER_GENDER))
      .optional()
      .messages({
        "any.only":
          "Gender must be one of: " + Object.values(USER_GENDER).join(", "),
      }),
    status: Joi.string()
      .valid(...Object.values(USER_STATUS))
      .optional()
      .messages({
        "any.only":
          "Status must be one of: " + Object.values(USER_STATUS).join(", "),
      }),
    dob: Joi.date()
      .less("now")
      .optional()
      .messages({
        "date.less":
          MESSEGES.DOB_IN_FUTURE || "Date of birth must be in the past.",
        "date.base":
          MESSEGES.DOB_INVALID || "Date of birth must be a valid date.",
      }),
    dateOfBirth: Joi.date()
      .less("now")
      .optional()
      .messages({
        "date.less":
          MESSEGES.DOB_IN_FUTURE || "Date of birth must be in the past.",
        "date.base":
          MESSEGES.DOB_INVALID || "Date of birth must be a valid date.",
      }),
  });

  const result = Schema.validate(data);
  return {
    error: result?.error,
    msg: result?.error?.details[0]?.message,
  };
};

export const validateForgotPasswordInput = (data) => {
  const Schema = Joi.object({
    email: Joi.string().email().required().messages({
      "string.email": MESSEGES.EMAIL_INVALID,
      "any.required": MESSEGES.EMAIL_REQUIRED,
    }),
  });

  const result = Schema.validate(data);
  return {
    error: result?.error,
    msg: result?.error?.details[0]?.message,
  };
};

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

export const validateChangePasswordInput = (data) => {
  const Schema = Joi.object({
    currentPassword: Joi.string().required().messages({
      "any.required": "Current password is required",
      "string.empty": "Current password cannot be empty",
    }),
    newPassword: Joi.string().min(8).max(30).required().messages({
      "string.min": MESSEGES.PASSWORD_MIN,
      "string.max": MESSEGES.PASSWORD_MAX,
      "any.required": "New password is required",
      "string.empty": "New password cannot be empty",
    }),
  });

  const result = Schema.validate(data);
  return {
    error: result?.error,
    msg: result?.error?.details[0]?.message,
  };
};

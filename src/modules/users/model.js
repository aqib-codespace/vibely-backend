import mongoose from "mongoose";
import bcrypt from "bcrypt";
import apiError from "../../utils/apiError.js";
import { USER_GENDER, USER_STATUS } from "../../constants/enums.js";

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
    },
    userName: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    status: {
      type: String,
      enum: Object.values(USER_STATUS),
      default: "single",
    },
    gender: {
      type: String,
      enum: Object.values(USER_GENDER),
      default: "prefer_not_to_say",
    },
    dateOfBirth: { type: Date, default: new Date("2000-01-01") },
    address: { type: String, default: "" },
    bio: { type: String, default: "" },

    password: {
      type: String,
      required: true,
    },

    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: {
      type: String,
      default: "",
    },
    emailVerificationExpiry: {
      type: Date,
      default: null,
    },

    resetToken: { type: String, default: "" },
    resetTokenExpiry: { type: Date, default: null },
    profilePicture: {
      url: { type: String, default: "" },
      public_id: { type: String, default: "" },
    },
    coverImage: {
      url: { type: String, default: "" },
      public_id: { type: String, default: "" },
    },
    hasLoggedInBefore: { type: Boolean, default: false },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }
  try {
    const hashedPassword = await bcrypt.hash(this.password, 10);
    this.password = hashedPassword;
    next();
  } catch (error) {
    return next(error);
  }
});

userSchema.methods.checkPassword = async function (password) {
  try {
    const same = await bcrypt.compare(password, this.password);
    return same;
  } catch (error) {
    console.log(error, "");
    throw apiError.internal(error, "checkPassword");
  }
};

export const User = mongoose.model("User", userSchema);
export default User;

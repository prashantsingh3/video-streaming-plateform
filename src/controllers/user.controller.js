
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import {ApiResponse} from "../utils/ApiResponse.js";

const registerUser = asyncHandler(async (req, res) => {
  const { fullName, email, username, password } = req.body;

  // 1. Validate required fields
  if (!fullName || !email || !username || !password) {
    throw new ApiError(400, "All fields are required");
  }

  // 2. Check if user already exists
  const existedUser = await User.findOne({
    $or: [
      { username: username.toLowerCase().trim() },
      { email: email.toLowerCase().trim() },
    ],
  });

  if (existedUser) {
    throw new ApiError(
      409,
      "User with this email or username already exists"
    );
  }

  // 3. Get local image paths
  const avatarLocalFilePath = req.files?.avatar?.[0]?.path;
  const coverImageLocalFilePath =
    req.files?.coverImage?.[0]?.path || null;

  // 4. Validate avatar
  if (!avatarLocalFilePath) {
    throw new ApiError(400, "Avatar image is required");
  }

  // 5. Upload images to Cloudinary
  const avatar = await uploadOnCloudinary(avatarLocalFilePath);

  if (!avatar?.url) {
    throw new ApiError(500, "Failed to upload avatar to Cloudinary");
  }

  let coverImage = null;

  if (coverImageLocalFilePath) {
    coverImage = await uploadOnCloudinary(coverImageLocalFilePath);
  }

  // 6. Create user in MongoDB
  const newUser = await User.create({
    fullName: fullName.trim(),
    email: email.toLowerCase().trim(),
    username: username.toLowerCase().trim(),
    password,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
  });

  // 7. Return user without sensitive fields
  const createdUser = await User.findById(newUser._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering user");
  }

  // 8. Send response
  return res.status(201).json(
    new ApiResponse(201, createdUser, "User registered successfully")
  );
});

export { registerUser };

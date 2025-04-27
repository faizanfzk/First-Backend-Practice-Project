import mongoose from "mongoose";
import { User } from "../models/user.model.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import uploadFileOnCloudinary from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";



const generateAccessAndRefereshTokens = async (userId) => {
    console.log("userId", userId);
    try {
        const user = await User.findById(userId);
        console.log("user", user);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();
        // save refresh token in the database
        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return {
            accessToken,
            refreshToken
        }

    } catch (error) {
        console.log("error", error);
        throw new ApiError(500, "Something went wrong while generating tokens",);
    }
}


const registerUser = asyncHandler(async (req, res) => {
    //get user details frontend
    // validation - not empty
    // check if user already exists: username or email
    // check for images, check for avatar
    // upload images to cloudinary, avatar
    // create user object - create entry in database(db)
    // remove password and refresh token field from response
    // check if user created successfully
    // send response to frontend

    const { username, email, fullName, password } = req.body;
    // console.log(username, email, fullName, password);

    if ([username, email, fullName, password].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "All fields are required");
    }

    const existedUser = await User.findOne({
        $or: [
            { username }, { email }
        ]
    })
    if (existedUser) {
        throw new Error(409, "User with email or username already exists");
    }

    const avatarLocalPath = req.files?.avatar[0].path; // provided by multer
    // const coverImageLocalPath = req.files?.coverImage[0].path; // provided by multer

    let coverImageLocalPath;
    if (req?.files && Array.isArray(req?.files?.coverImage) && req?.files?.coverImage.length > 0) {
        coverImageLocalPath = req.files?.coverImage[0].path;
    }

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar is required");
    }
    // upload images to cloudinary

    const avatar = await uploadFileOnCloudinary(avatarLocalPath);
    const coverImage = coverImageLocalPath ? await uploadFileOnCloudinary(coverImageLocalPath) : "";

    if (!avatar) {
        throw new ApiError(400, "Avatar is required");
    }

    const user = await User.create({
        fullName,
        email,
        username: username.toLowerCase(),
        avatar: avatar?.url,
        coverImage: coverImage?.url ? coverImage?.url : "",
        password,
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken" // remove password and refresh token field from response
    )
    if (!createdUser) {
        throw new ApiError(400, "Something went wrong while registring the user");
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered successfully")
    )
})

const loginUser = asyncHandler(async (req, res) => {
    // req body -> data
    // username or email
    //find the user
    //password check
    //access and referesh token
    //send cookie

    const { email, username, password } = req.body
    console.log(email);

    if (!username && !email) {
        throw new ApiError(400, "username or email is required")
    }

    // Here is an alternative of above code based on logic discussed in video:
    // if (!(username || email)) {
    //     throw new ApiError(400, "username or email is required")

    // }

    const user = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (!user) {
        throw new ApiError(404, "User does not exist")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials")
    }

    const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(user._id)

    console.log("accessToken", accessToken);
    console.log("refreshToken", refreshToken);

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    console.log("loggedInUser", loggedInUser);

    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production", // Only use secure in production
        sameSite: "lax" // Add this to help with cross-origin issues
    }

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                "User logged In Successfully",
                {
                    user: loggedInUser,
                    accessToken,
                    refreshToken
                }
            )
        )

})

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(req.user._id,
        {
            $unset: {
                refreshToken: 1 // this removes the refresh token from the user document
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax"
    }

    return res
        .status(200)
        .clearCookie("accessToken", options)  // Remove the accessToken parameter
        .clearCookie("refreshToken", options) // Remove the refreshToken parameter
        .json(new ApiResponse(200, "User logged out", {}))
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req?.cookies?.refreshToken || req.body.refreshToken;

    if (!incomingRefreshToken) {
        throw new ApiError(401, "unauthorized request")
    }
    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);

        const user = await User.findById(decodedToken?._id);
        if (!user) {
            throw new ApiError(401, "invalid refresh token")
        }

        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used")
        }

        const options = {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax"
        }

        const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(user._id);

        return res.status(200).cookie("accessToken", accessToken, options).cookie("refreshToken", refreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    "Access token refreshed successfully",
                    {
                        accessToken,
                        refreshToken
                    }
                )
            )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")

    }

})
const changePassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;

    const user = await User.findById(req?.user?._id);

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid password");
    }
    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    return res.status(200).json(
        new ApiResponse(200, "Password changed successfully", {})
    )
})

const getCurrentUser = asyncHandler(async (req, res) => {
    return res.status(200).json(
        new ApiResponse(200, "current user fetch successsfully", req?.user)
    )
})

const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullName, email } = req.body;

    if (!fullName || !email) {
        throw new ApiError(400, "All fields are required")
    }

    const user = await User.findByIdAndUpdate(
        req?.user?._id,
        {
            $set: {
                fullName,
                email
            }
        },
        { new: true }
    ).select("-passsword")

    return res.status(200).json(
        new ApiResponse(200, 'account details updated successfully', user)
    )
})

const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req?.file?.path;

    if (!avatarLocalPath) {
        throw new ApiError(400, 'Avatar file is missing')
    }
    const avatar = await uploadFileOnCloudinary(avatarLocalPath);

    if (!avatar?.url) {
        throw new ApiError(400, 'Error while uploading on avatar')
    }

    const user = await User.findByIdAndUpdate(
        req?.user?._id,
        {
            $set: {
                avatar: avatar?.url
            }
        },
        { new: true }
    ).select("-password");

    return res.status(200).json(
        new ApiResponse(200, 'avatar updated successfully', user)
    )
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req?.file?.path;

    if (!coverImageLocalPath) {
        throw new ApiError(400, 'Avatar file is missing')
    }
    const coverImage = await uploadFileOnCloudinary(coverImageLocalPath);

    if (!coverImage?.url) {
        throw new ApiError(400, 'Error while uploading on coverImage')
    }

    const user = await User.findByIdAndUpdate(
        req?.user?._id,
        {
            $set: {
                coverImage: coverImage?.url
            }
        },
        { new: true }
    ).select("-password");

    return res.status(200).json(
        new ApiResponse(200, 'cover image updated successfully', user)
    )
})

const getUserChannelProfile = asyncHandler(async (req, res) => {
   const {username} = req.params;

   if(!username?.trim()){
    throw new ApiError(400, "username is required")
   }

   const channel = await User.aggregate([ // writing aggregation query for getting channel profile , 
   // aggregation is used for joining two collections
    {
        $match:{  // match is used for filtering the documents
            username: username?.toLowerCase()
        }
    },
    {
        $lookup:{  // lookup is used for joining two collections
            from:"subscriptions",
            localField:"_id",
            foreignField:"channel",
            as:"subscribers"
        }
    },
    {
        $lookup:{
            from:"subscriptions",
            localField:"_id",
            foreignField:"subscriber",
            as:"subscribedTo"
        }

    },
    {
        $addFields:{
            subscribersCount:{
                $size:"$subscribers" // count of subscribers
            },
            channelSubscribedToCount:{
                $size:"$subscribedTo" // count of subscribed to
            },
            isSubscribed:{
                $cond:{
                    if:{ $in:["req.user?._id","$subscribers.subscriber"]},
                    then:true,
                    else:false
                }
            }
        }
    },
    {
        $project:{ // projecting the fields to be returned. Project is used to include or exclude fields
        
            username:1,
            fullName:1,
            avatar:1,
            coverImage:1,
            subscribersCount:1,
            channelSubscribedToCount:1,
            isSubscribed:1,
            email:1,

        }
    }
   ])
   if(!channel?.length){
    throw new ApiError(404, "Channel does not exist")
   }

   return res.status(200).json(
    new ApiResponse(200, "Channel profile fetched successfully", channel[0])
   )

})

const getWatchHistory = asyncHandler(async (req, res) => {

    const user = await User.aggregate([
        {
            $match:{
                _id: new mongoose.Types.ObjectId(req.user._id) // match the user id. Using mongoose.Types.ObjectId to convert string to ObjectId and here we cannot get _id from req.user._id because it is a string and we need to convert it to ObjectId
            },
            $lookup:{
                from:"videos",
                localField:"watchHistory",
                foreignField:"_id",
                as:"watchHistory",
                pipeline:[
                    {
                        $lookup:{
                            from:"users",
                            localField:"owner",
                            foreignField:"_id",
                            as:"owner",
                            pipeline:[
                                {
                                    $project:{
                                        fullName:1,
                                        username:1,
                                        avatar:1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields:{
                            owner:{
                                $first: "$owner"  // get the first element of the array
                            }
                        }
                    }
                ]
            }
        }
    ])
    return res.status(200).json(
        new ApiResponse(200, "Watch history fetched successfully", user[0]?.watchHistory)
    )
});

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changePassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory

};
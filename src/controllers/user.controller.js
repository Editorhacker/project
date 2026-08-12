import {asyncHandler} from '../utils/asyncHandler.js';
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from '../utils/cloudinary.js'
import { ApiResponse } from '../utils/ApiResponce.js';
import jwt from 'jsonwebtoken';

const generateAccessAndRefreshTokens = async (userId)=> {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false})

        return {accessToken, refreshToken}

    } catch (error) {
        console.log("token error ", error);
        
        throw new ApiError(500, error.message ||"Somthing Went Wrong While generating refresh and access token")
    }
}

const registerUser = asyncHandler(async (req,res) => {
    
    const {fullname, email, username,password }= req.body
    

    if (
        [fullname, email, username, password].some((field) =>
        field?.trim() === "")
        )
        {
        throw new ApiError(400,"All fields are required")
    }
    const existedUser =await User.findOne({
        $or: [{ username },{ email } ]
    })
    if (existedUser) {
        throw new ApiError(409, "User already exists")
    }    
    
    
    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;  

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }


    if (!avatarLocalPath) {
        throw new ApiError(400,"Avatar file is required")
    }

   const avatar = await uploadOnCloudinary(avatarLocalPath)
   const coverImage = await uploadOnCloudinary(coverImageLocalPath)
   if (!avatar) {
        throw new ApiError(400,"Avatar is required")
   }

   const user = await User.create({
        fullname,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
   })

   const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
   )

   if (!createdUser) {
        throw new ApiError(500, "Somthing went wrong while registering user ")
   }

   return res.status(201).json(
    new ApiResponse(200, createdUser, "user registerd successfully")
   )

})


const loginUser = asyncHandler(async (req, res) => {

    //get data from user
    //check username or email
    //find the user
    //password check 
    //generate access token and refresh token
    //send cookie 

    const {email, username, password}= req.body
    console.log(email);
    
    if (!username && !email) {
        throw new ApiError(400,"username or password is required")
    }

    if (!password) {
        throw new ApiError(400,"password is required")
    }

    const user = await User.findOne({
        $or: [{username},{email}]
    })
    if (!user) {
        throw new ApiError(404,"User not found")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if (!isPasswordValid) {
        throw new ApiError(401,"password is incorrect")
    }

    const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id)

    const loggedInUser =  await User.findById(user._id).select(
        "-password -refreshToken"
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200,
            {
                user: loggedInUser, accessToken, refreshToken
            },
            "User logged in Successfuly"
        )
    )
})

const logoutUser = asyncHandler(async (req, res) => {
   await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200,{}, "User logged out"))

})

const refreshAccessToken = asyncHandler(async (req, res) =>{
    const incomingRerfreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRerfreshToken) {
        throw new ApiError(401," Unauthorized Request")
    }

   try {
     const deocdedToken = jwt.verify(incomingRerfreshToken, process.env.REFRESH_TOKEN_SECRET)
     
     const user = await User.findById(decodedToken?._id)
 
     if (!user) {
         throw new ApiError(401," Invalid Refresh Token")
     }
 
     if (incomingRerfreshToken !== user?.refreshToken) {
          throw new ApiError(401," Refresh token in expired or used")
     }
 
     const options = {
         httpOnly: true,
          secure: true
     }
 
     const {accessToken, newRefreshToken} = await generateAccessAndRefreshTokens(user._id)
 
     return res
     .status(200)
     .cookie("accessToken", accessToken, options)
     .console("refreshToken", newRefreshToken, options)
     .json(
         new ApiResponse(
             200,
             {accessToken, refreshToken: newRefreshToken },
         "Access token refreshed"
         )
     )
   } catch (error) {
        throw new ApiError(401, error?.message || "Invalid Refresh token")
   }
})

const changeCurrentPassword = asyncHandler(async(req,res) => {
    const {oldPassword,newPassword} = req.body

    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        throw new ApiError(400,"Invalid old password ")
    }

    user.password = newPassword
    await user.save({validateBeforeSave: false})

    return res.status(200)
    .json(
        new ApiResponse(200,{},"Password Change")
    )
})


const getCurrentUser = asyncHandler(async(req, res) =>{
    return res.status(200)
    .json(200, req.user, "Cureent User fetched Successfully")
})


const updateAccountDetails = asyncHandler(async(req, res) => {
    const {fullname,  email} = req.body

    if (!fullname || !email) {
        throw new ApiError(400,"All fields are required")
    }
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullname,
                email
            }
        },
        {new:true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200, user,"Accound details update successfully" )
    )
})


const updateUserAvata = asyncHandler(async(req, res) =>{
    const avatarLocalPath = req.file?.path
    if (!avatarLocalPath) {
        throw new ApiError(400, "avatar file is missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if (!avatar.url) {
      throw new ApiError(400, "Error while uploding on avatar")

    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar: avatar.url
            }
        },
        {new:true}
    ).select("-password")
    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "Avatar update successfully")
    )
})

const updateUserCoverImage = asyncHandler(async(req, res) =>{
    const coverImageLocalPath = req.file?.path
    if (!coverImageLocalPath) {
        throw new ApiError(400, "CoverImage file is missing")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!coverImage.url) {
      throw new ApiError(400, "Error while uploding on CoverImage")

    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage: coverImage.url
            }
        },
        {new:true}
    ).select("-password")
    return res
    .status(200)
    .json(
        new ApiResponse(
            200, user, "CoverImage successfully updated"
        )
    )
})

const getUserChannelProfile = asyncHandler(async(req, res)=>{
    const {username}= req.params

    if (!username?.trim()) {
        throw new ApiError(400,"username is missing")
    }

    const channel = await User.aggregate([
        {
            $match:{
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
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
                subscribersCount: {
                    $size: "$subscribers"
                },
                channelsSubscribedToCount:{
                    $size:"$subscribedTo"
                },
                isSubscribed:{
                    $cond:{
                        if:{$in: [ req.user?._id, "$subscribers.subscriber"]},
                        then:true,
                        else: false

                    }
                }
            }
        },
        {
            $project:{
                fullname: 1,
                username:1,
                subscribersCount:1,
                channelsSubscribedToCount:1,
                isSubscribed:1,
                avatar:1,
                coverImage:1,
                email:1
            }
        }
    ])

    console.log(channel);
    
    if (!channel?.length) {
        throw new ApiResponse(404, "channel does not exists")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, channel[0], "user channel fetched successfully")
    )

})
export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvata,
    updateUserCoverImage,
    getUserChannelProfile
}
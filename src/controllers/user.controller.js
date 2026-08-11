import {asyncHandler} from '../utils/asyncHandler.js';
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from '../utils/cloudinary.js'
import { ApiResponse } from '../utils/ApiResponce.js';


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

export {
    registerUser,
    loginUser,
    logoutUser
}
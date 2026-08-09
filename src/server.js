import dotenv from "dotenv"
import mongoose from "mongoose";
import connectDB from "./db/db.js";

dotenv.config({
    path: "./env"
})

connectDB()





/* THIS IS OLD APPROCH NOT GOOD FOR PRODUCTION
import express from "express"
const app = express()

THIS IS EFI
(async () => {
    try{
        await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`)
        app.on("error", () => {
            console.log("error", error);
            throw error
            
        })
        app.listen(process.env.PORT, () =>{
            console.log(`App is Running on ${process.env.PORT}`);
            
        })

    }catch (error){
        console.error("ERROR: ", error)
        throw err
    }


})()
    */
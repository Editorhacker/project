import dotenv from "dotenv"
import mongoose from "mongoose";
import connectDB from "./db/db.js";
import { app } from "./app.js";

dotenv.config({
    path: "./env"
})

connectDB()
.then( () =>{
    app.listen(process.env.PORT || 5000, () =>{
        console.log(`Server is Running on port : ${process.env.PORT}`);
        
    })
})
.catch((err) =>{
    console.log("MONGO DB CONNECTION FIALD !!! ", err);
    
})





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
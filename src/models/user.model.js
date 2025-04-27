import mongoose, { Schema } from "mongoose";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const userSchema = new Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true // for faster search
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        fullName: {
            type: String,
            required: true,
            trim: true,
            index: true
        },
        avatar: {
            type: String, // URL
            required: true
        },
        coverImage: {
            type: String,

        },
        watchHistory: [
            {
                type: Schema.Types.ObjectId,
                ref: "Video" // Video model
            }
        ],
        password: {
            type: String,
            required: [true, "Password is required"],
        },
        refreshToken: {
            type: String
        }

    }, { timestamps: true } // createdAt, updatedAt
)

userSchema.pre("save",async function(next){

    if(!this.isModified("password")) return next(); // if password is not modified, skip hashing
    
    // if password is modified or added , hash it 
    this.password = await bcrypt.hash(this.password,10)
    next();
});

userSchema.methods.isPasswordCorrect = async function(password){
    return await  bcrypt.compare(password,this.password); // compare the password with hashed password
}
userSchema.methods.generateAccessToken = function(){
       // generate access token
    return jwt.sign(
        {
            _id:this._id,
            username:this.username,
            email:this.email,
            fullName:this.fullName,
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn:process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}
userSchema.methods.generateRefreshToken = function(){
    return jwt.sign(
        {
            _id:this._id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn:process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

export const User = mongoose.model("User",userSchema);
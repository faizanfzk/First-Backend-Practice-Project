import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema = new Schema(
    {
        videoFile:{
            type:String, // URL
            required:true,
        },
        thumbnail:{
            type:String, // URL
            required:true,
        },
        title:{
            type:String,
            required:true,
        },
        description:{
            type:String,
            required:true,
        },
        duration:{
            type: Number,
            required:true
        },
        views:{
            type:Number,
            default:0
        },
        isPublished:{
            type: Boolean,
            default:true
        },
        user:{
            type:Schema.Types.ObjectId,
            ref:"User"
        }

    }, { timestamps: true }
)

videoSchema.plugin(mongooseAggregatePaginate); // This plugin adds pagination capabilities to the schema

export const Video = mongoose.model('Video', videoSchema);
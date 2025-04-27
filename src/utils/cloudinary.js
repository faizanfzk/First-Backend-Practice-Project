import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';


// Configuration
cloudinary.config({
    cloud_name:process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret:process.env.CLOUDINARY_API_SECRET,
});

const uploadFileOnCloudinary = async (localFilePath) => {
    try {
        if(!localFilePath) {
            throw new Error('No file path provided');
        }
        // upload file to cloudinary
        const response = await cloudinary.uploader.upload(localFilePath,{
            resource_type: 'auto',
        })
        // if file uploaded successfully
        console.log('File uploaded successfully on cloudinary', response.url);
        // remove the locally save temporary file
        fs.unlinkSync(localFilePath); // remove the locally save temporary file
        return response;

    } catch (error) {
        fs.unlinkSync(localFilePath); // remove the locally save temporary file as the operation got failed
        return null;
    }
}

export default uploadFileOnCloudinary;


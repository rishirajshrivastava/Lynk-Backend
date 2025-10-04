const express = require('express');
const userRouter = express.Router();
const userAuth = require('../middlewares/auth');
const ConnectionRequest = require('../models/connectionRequest');
const User = require('../models/user')
const fileUpload = require('express-fileupload');

const USER_SAFE_DATA = "firstName lastName photoUrl age gender about skills";

//Get all the pending request for the loggedIn user
userRouter.get("/user/requests/recieved", userAuth, async (req, res) => {
    try {
        const loggedInUser = req.user;
        const pendingRequests = await ConnectionRequest.find({
            toUserId: loggedInUser._id,
            status: 'interested'
        }).populate("fromUserId", ["firstName" , "lastName", "age" ,"gender", "about", "skills", "photoUrl"]);
        res.json({
            message: "Pending connection requests",
            data: pendingRequests
        });
    } catch (err) {
        res.status(500).send("Error: " + err.message);
    }
});

userRouter.get("/user/connections", userAuth, async (req,res) =>{
    try {
        const loggedInUser = req.user;
        const connectionRequests = await ConnectionRequest.find({
            $or: [
                { fromUserId: loggedInUser._id, status: "accepted" },
                { toUserId: loggedInUser._id, status: "accepted" }
            ]
        }).populate("fromUserId" ,USER_SAFE_DATA)
        .populate("toUserId", USER_SAFE_DATA);

        const data = connectionRequests.map((row) =>{
            if((row.fromUserId._id).toString() === (loggedInUser._id).toString()){
                return row.toUserId;
            }
            return row.fromUserId;
        })
        res.json({data : data});
    } catch(err) {
        res.status(400).send("Error: " + err.message);
    }
})

userRouter.get("/feed", userAuth,async(req,res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        let limit = parseInt(req.query.limit) || 10;
        if (isNaN(limit) || limit <= 0) limit = 10;
        limit = limit >50 ? 50 : limit;
        const skip = (page-1)*limit;
        const loggedInUser = req.user;
        const connectionRequest = await ConnectionRequest.find({
            $or: [
                {fromUserId: loggedInUser._id},
                {toUserId : loggedInUser._id}
            ]
        }).select("fromUserId toUserId")

        const hideUsersFromFeed = new Set();
        connectionRequest.forEach(req => {
            hideUsersFromFeed.add(req.fromUserId.toString());
            hideUsersFromFeed.add(req.toUserId.toString());
        })
        const users = await User.find({
            $and: [
                {_id: {$nin: Array.from(hideUsersFromFeed)}},
                {_id : {$ne: loggedInUser._id}}
            ]
            
        }).select(USER_SAFE_DATA).skip(skip).limit(limit);
        res.json({data: users});
    } catch(err) {
        res.status(400).json({message: err.message})
    }
})

userRouter.post("/user/upload-photos", userAuth, fileUpload(), async (req, res) => {
    try {
        if (!req.files) {
            return res.status(400).json({ message: "No photos uploaded" });
        }

        const loggedInUser = req.user;
        
        let photos;
        if (req.files.photos) {
            photos = req.files.photos;
        } else if (req.files.photo) {
            photos = req.files.photo;
        } else {
            return res.status(400).json({ message: "No photos uploaded. Use 'photo' for single upload or 'photos' for multiple uploads." });
        }
        
        const photoArray = Array.isArray(photos) ? photos : [photos];
        
        if (photoArray.length > 6) {
            return res.status(400).json({
                message: "Maximum 6 photos allowed", 
                uploaded: photoArray.length,
                maxAllowed: 6
            });
        }

        if (photoArray.length === 0) {
            return res.status(400).json({ message: "No photos uploaded" });
        }

        // Check existing photos count in S3
        const { countUserPhotos } = require('../utils/countPhotos');
        const existingPhotoCount = await countUserPhotos(loggedInUser._id);
        const totalPhotosAfterUpload = existingPhotoCount + photoArray.length;

        if (totalPhotosAfterUpload > 6) {
            return res.status(400).json({
                message: "Total photos cannot exceed 6",
                existingPhotos: existingPhotoCount,
                tryingToUpload: photoArray.length,
                totalAfterUpload: totalPhotosAfterUpload,
                maxAllowed: 6
            });
        }

        const uploadResults = [];
        const errors = [];

        for (let i = 0; i < photoArray.length; i++) {
            try {
                const photo = photoArray[i];
                const fileExtension = photo.name.split('.').pop();
                
                let filename = `users/${loggedInUser._id}/profile-${Date.now()}.${fileExtension}`;

                const { putObject } = require('../utils/putObject');
                const { photoUrl, key } = await putObject(photo.data, filename);
                
                uploadResults.push({
                    index: i,
                    originalName: photo.name,
                    photoUrl: photoUrl,
                    key: key,
                    success: true
                });
            } catch (error) {
                console.error(`Error uploading photo ${i}:`, error);
                errors.push({
                    index: i,
                    originalName: photoArray[i].name,
                    error: error.message,
                    success: false
                });
            }
        }

        if (uploadResults.length > 0) {
            const photoUrls = uploadResults.map(result => result.photoUrl);
            
            if (photoArray.length === 1) {
                await User.findByIdAndUpdate(loggedInUser._id, { photoUrl: photoUrls[0] });
            } else {
                await User.findByIdAndUpdate(loggedInUser._id, { photos: photoUrls });
            }
        }

        const isSinglePhoto = photoArray.length === 1;
        const responseMessage = isSinglePhoto 
            ? `Photo uploaded successfully` 
            : `Bulk upload completed. ${uploadResults.length} photos uploaded successfully`;

        res.json({
            message: responseMessage,
            totalPhotos: photoArray.length,
            successfulUploads: uploadResults.length,
            failedUploads: errors.length,
            userId: loggedInUser._id,
            existingPhotos: existingPhotoCount,
            totalPhotosAfterUpload: existingPhotoCount + uploadResults.length,
            results: uploadResults,
            errors: errors.length > 0 ? errors : undefined
        });
    }
    catch (err) {
        console.error("Bulk upload error:", err);
        res.status(400).json({message: err.message})
    }
})

// Delete a specific image
userRouter.delete("/user/delete-photo", userAuth, async (req, res) => {
    try {
        const { photoUrl } = req.body;
        const loggedInUser = req.user;

        if (!photoUrl) {
            return res.status(400).json({ message: "Photo URL is required" });
        }

        // Extract the key from the photo URL
        const urlParts = photoUrl.split('/');
        const key = urlParts.slice(3).join('/'); // Remove the domain parts

        // Delete from S3
        const { deleteObject } = require('../utils/deleteObject');
        await deleteObject(key);

        // Update user's photoUrl array in database
        await User.findByIdAndUpdate(
            loggedInUser._id, 
            { $pull: { photoUrl: photoUrl } }
        );

        res.json({
            message: "Photo deleted successfully",
            deletedPhotoUrl: photoUrl,
            userId: loggedInUser._id
        });
    } catch (err) {
        console.error("Delete photo error:", err);
        res.status(400).json({ message: err.message });
    }
});

userRouter.delete("/user/delete-all-photos", userAuth, async (req, res) => {
    try {
        const loggedInUser = req.user;

        // Get all photos from S3 for this user
        const { countUserPhotos } = require('../utils/countPhotos');
        const { ListObjectsV2Command } = require('@aws-sdk/client-s3');
        const { s3Client } = require('../utils/s3-credentials');

        // List all objects in the user's folder
        const params = {
            Bucket: process.env.AWS_S3_BUCKET,
            Prefix: `users/${loggedInUser._id}/`,
        };

        const command = new ListObjectsV2Command(params);
        const response = await s3Client.send(command);
        
        if (!response.Contents || response.Contents.length === 0) {
            return res.status(400).json({ message: "No photos found to delete" });
        }

        // Filter only image files and get their keys
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
        const imageKeys = response.Contents
            .filter(obj => {
                const key = obj.Key.toLowerCase();
                return imageExtensions.some(ext => key.endsWith(ext));
            })
            .map(obj => obj.Key);

        if (imageKeys.length === 0) {
            return res.status(400).json({ message: "No image files found to delete" });
        }

        // Delete all photos from S3
        const { deleteObjects } = require('../utils/deleteObject');
        const deleteResult = await deleteObjects(imageKeys);

        // Clear all photos from user's database record
        await User.findByIdAndUpdate(loggedInUser._id, { photoUrl: [] });

        res.json({
            message: "All photos deleted successfully",
            deletedCount: deleteResult.deletedCount,
            deletedKeys: deleteResult.deletedKeys,
            userId: loggedInUser._id
        });
    } catch (err) {
        console.error("Delete all photos error:", err);
        res.status(400).json({ message: err.message });
    }
});

userRouter.put("/user/edit-photo", userAuth, fileUpload(), async (req, res) => {
    try {
        const { oldPhotoUrl } = req.body;
        const loggedInUser = req.user;

        if (!oldPhotoUrl) {
            return res.status(400).json({ message: "Old photo URL is required" });
        }

        if (!req.files || !req.files.photo) {
            return res.status(400).json({ message: "New photo file is required" });
        }

        const newPhoto = req.files.photo;
        const fileExtension = newPhoto.name.split('.').pop();
        
        // Generate new filename
        const filename = `users/${loggedInUser._id}/profile-${Date.now()}.${fileExtension}`;

        // Upload new photo to S3
        const { putObject } = require('../utils/putObject');
        const { photoUrl: newPhotoUrl, key: newKey } = await putObject(newPhoto.data, filename);

        // Delete old photo from S3
        const oldKey = oldPhotoUrl.split('/').slice(3).join('/');
        const { deleteObject } = require('../utils/deleteObject');
        await deleteObject(oldKey);

        // No database operations - only S3 operations

        res.json({
            message: "Photo updated successfully",
            oldPhotoUrl: oldPhotoUrl,
            newPhotoUrl: newPhotoUrl,
            userId: loggedInUser._id
        });
    } catch (err) {
        console.error("Edit photo error:", err);
        res.status(400).json({ message: err.message });
    }
});

userRouter.get("/user/photos", userAuth, async (req, res) => {
    try {
        const loggedInUser = req.user;
        
        // Get photos directly from S3
        const { ListObjectsV2Command } = require('@aws-sdk/client-s3');
        const { s3Client } = require('../utils/s3-credentials');

        // List all objects in the user's folder
        const params = {
            Bucket: process.env.AWS_S3_BUCKET,
            Prefix: `users/${loggedInUser._id}/`,
        };

        const command = new ListObjectsV2Command(params);
        const response = await s3Client.send(command);
        
        if (!response.Contents || response.Contents.length === 0) {
            return res.json({
                message: "No photos found",
                photos: [],
                photoCount: 0,
                userId: loggedInUser._id
            });
        }

        // Filter only image files and generate URLs
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
        const photos = response.Contents
            .filter(obj => {
                const key = obj.Key.toLowerCase();
                return imageExtensions.some(ext => key.endsWith(ext));
            })
            .map(obj => {
                const photoUrl = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${obj.Key}`;
                return {
                    key: obj.Key,
                    url: photoUrl,
                    lastModified: obj.LastModified,
                    size: obj.Size
                };
            });

        res.json({
            message: "Photos retrieved successfully",
            photos: photos,
            photoCount: photos.length,
            userId: loggedInUser._id
        });
    } catch (err) {
        console.error("Get photos error:", err);
        res.status(400).json({ message: err.message });
    }
});

module.exports = userRouter;
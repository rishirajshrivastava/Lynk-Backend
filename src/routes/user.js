const express = require('express');
const userRouter = express.Router();
const userAuth = require('../middlewares/auth');
const verifyUser = require('../middlewares/verify');
const ConnectionRequest = require('../models/connectionRequest');
const User = require('../models/user')
const fileUpload = require('express-fileupload');

const USER_SAFE_DATA = "firstName lastName photoUrl age gender about skills height weight location occupation education smoking drinking exercise diet hasKids wantsKids about interests hobbies languages interestedIn relationshipStatus lookingFor bodyType ethnicity religion politicalViews";

userRouter.post("/user/report/:toUserId", userAuth, verifyUser, async (req, res) => {
    try {
        const fromUser = req.user;
        const { toUserId } = req.params;
        const { reason, details } = req.body || {};

        if (!toUserId) {
            return res.status(400).json({ message: "toUserId is required" });
        }

        // 1) Find existing connection requests in either direction and mark all as blocked
        const blockResult = await ConnectionRequest.updateMany(
            {
                $or: [
                    { fromUserId: fromUser._id, toUserId },
                    { fromUserId: toUserId, toUserId: fromUser._id }
                ]
            },
            { $set: { status: "blocked" } }
        );

        await User.findByIdAndUpdate(toUserId, { $inc: { reportedCount: 1 } });

        const reportEntry = { toUserId, reason: reason || "", details: details || "" };
        await User.findByIdAndUpdate(fromUser._id, { $push: { hasReported: reportEntry } });

        return res.json({
            message: "User reported successfully",
        });
    } catch (err) {
        return res.status(400).json({ message: err.message });
    }
});

//Get all the pending request for the loggedIn user
userRouter.get("/user/requests/recieved", userAuth, verifyUser, async (req, res) => {
    try {
        const loggedInUser = req.user;
        const pendingRequests = await ConnectionRequest.find({
            toUserId: loggedInUser._id,
            status: 'interested'
        }).populate("fromUserId", USER_SAFE_DATA);

        // Transform arrays to return only first element for lookingFor and interestedIn
        const transformedRequests = pendingRequests.map(request => {
            const requestObj = request.toObject();
            if (requestObj.fromUserId) {
                if (requestObj.fromUserId.lookingFor && Array.isArray(requestObj.fromUserId.lookingFor) && requestObj.fromUserId.lookingFor.length > 0) {
                    requestObj.fromUserId.lookingFor = requestObj.fromUserId.lookingFor[0];
                }
                if (requestObj.fromUserId.interestedIn && Array.isArray(requestObj.fromUserId.interestedIn) && requestObj.fromUserId.interestedIn.length > 0) {
                    requestObj.fromUserId.interestedIn = requestObj.fromUserId.interestedIn[0];
                }
            }
            return requestObj;
        });

        res.json({
            message: "Pending connection requests",
            data: transformedRequests
        });
    } catch (err) {
        res.status(500).send("Error: " + err.message);
    }
});

userRouter.get("/user/connections", userAuth, verifyUser, async (req,res) =>{
    try {
        const loggedInUser = req.user;
        const connectionRequests = await ConnectionRequest.find({
            $or: [
                { fromUserId: loggedInUser._id, status: "accepted" },
                { toUserId: loggedInUser._id, status: "accepted" }
            ]
        }).populate("fromUserId" ,USER_SAFE_DATA)
        .populate("toUserId", USER_SAFE_DATA);

        // Collect only unique users (by _id) from accepted connections
        const uniqueUsersMap = new Map();
        connectionRequests.forEach((row) => {
            const otherUser = (row.fromUserId._id).toString() === (loggedInUser._id).toString()
                ? row.toUserId
                : row.fromUserId;
            const key = otherUser._id.toString();
            if (!uniqueUsersMap.has(key)) {
                uniqueUsersMap.set(key, otherUser);
            }
        });

        const data = Array.from(uniqueUsersMap.values());
        res.json({data});
    } catch(err) {
        res.status(400).send("Error: " + err.message);
    }
})

userRouter.get("/feed", userAuth, verifyUser, async(req,res) => {
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
        });
        
        // Add blocked users to the hide list
        if (loggedInUser.hasBlocked && Array.isArray(loggedInUser.hasBlocked)) {
            loggedInUser.hasBlocked.forEach(blockedUserId => {
                hideUsersFromFeed.add(blockedUserId.toString());
            });
        }
        const users = await User.find({
            $and: [
                {_id: {$nin: Array.from(hideUsersFromFeed)}},
                {_id : {$ne: loggedInUser._id}},
                {verified: true}
            ]
            
        }).select(USER_SAFE_DATA).skip(skip).limit(limit);

        // Transform arrays to return only first element for lookingFor and interestedIn
        const transformedUsers = users.map(user => {
            const userObj = user.toObject();
            if (userObj.lookingFor && Array.isArray(userObj.lookingFor) && userObj.lookingFor.length > 0) {
                userObj.lookingFor = userObj.lookingFor[0];
            }
            if (userObj.interestedIn && Array.isArray(userObj.interestedIn) && userObj.interestedIn.length > 0) {
                userObj.interestedIn = userObj.interestedIn[0];
            }
            return userObj;
        });
        res.json({data: transformedUsers});
    } catch(err) {
        res.status(400).json({message: err.message})
    }
})

userRouter.post("/user/upload-photos", userAuth, fileUpload({
    limits: { 
        fileSize: 5 * 1024 * 1024, // 5MB per file
        files: 6 // Maximum 6 files
    },
    abortOnLimit: true,
    responseOnLimit: "File size exceeds the 5MB limit or too many files"
}), async (req, res) => {
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
        
        // Check file size (5MB per photo)
        const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes
        const MAX_TOTAL_SIZE = 30 * 1024 * 1024; // 30MB total (6 photos * 5MB)
        let totalSize = 0;
        
        for (let i = 0; i < photoArray.length; i++) {
            if (photoArray[i].size > MAX_FILE_SIZE) {
                return res.status(400).json({
                    message: `Photo ${i + 1} exceeds maximum file size of 5MB`,
                    fileName: photoArray[i].name,
                    fileSize: photoArray[i].size,
                    maxSize: MAX_FILE_SIZE
                });
            }
            totalSize += photoArray[i].size;
        }
        
        if (totalSize > MAX_TOTAL_SIZE) {
            return res.status(400).json({
                message: "Total upload size exceeds 30MB limit",
                totalSize: totalSize,
                maxTotalSize: MAX_TOTAL_SIZE
            });
        }
        
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

        if (totalPhotosAfterUpload > 7) {
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
            
            // Update database to keep it in sync with S3
            // Get current user's photos and add new ones
            const user = await User.findById(loggedInUser._id);
            const currentPhotos = user.photoUrl || [];
            
            // Add new photo URLs to existing ones
            const updatedPhotos = [...currentPhotos, ...photoUrls];
            
            // Update the database with all photos (existing + new)
            await User.findByIdAndUpdate(
                loggedInUser._id, 
                { photoUrl: updatedPhotos }
            );
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

// Upload selfie for user verification
userRouter.post("/user/upload-selfie", userAuth, fileUpload({
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    abortOnLimit: true,
    responseOnLimit: "File size exceeds the 5MB limit"
}), async (req, res) => {
    try {
        if (!req.files || !req.files.selfie) {
            return res.status(400).json({ message: "No selfie photo uploaded" });
        }

        const loggedInUser = req.user;
        const selfie = req.files.selfie;
        const fileExtension = selfie.name.split('.').pop();
        
        // Generate filename with UserVerificationPhoto prefix
        const filename = `users/${loggedInUser._id}/UserVerificationPhoto-${Date.now()}.${fileExtension}`;

        // Upload to S3
        const { putObject } = require('../utils/putObject');
        const { photoUrl, key } = await putObject(selfie.data, filename);

        // Update user's clickedPhoto in database
        await User.findByIdAndUpdate(
            loggedInUser._id, 
            { clickedPhoto: photoUrl }
        );

        res.json({
            message: "Selfie uploaded successfully for verification",
            selfieUrl: photoUrl,
            key: key,
            userId: loggedInUser._id
        });
    } catch (err) {
        console.error("Selfie upload error:", err);
        res.status(400).json({ message: err.message });
    }
});

// Delete a specific image
userRouter.delete("/user/delete-photo", userAuth, async (req, res) => {
    try {
        const { photoUrl } = req.body;
        const loggedInUser = req.user;

        if (!photoUrl) {
            return res.status(400).json({ message: "Photo URL is required" });
        }

        // First, check if photo exists in database (source of truth)
        const user = await User.findById(loggedInUser._id);
        if (!user || !user.photoUrl || !user.photoUrl.includes(photoUrl)) {
            return res.status(404).json({ 
                message: "Photo not found in database",
                photoUrl: photoUrl
            });
        }

        // Extract the key from the photo URL
        const urlParts = photoUrl.split('/');
        const key = urlParts.slice(3).join('/'); // Remove the domain parts

        // Try to delete from S3 (but don't fail if it doesn't exist there)
        try {
            const { deleteObject } = require('../utils/deleteObject');
            await deleteObject(key);
        } catch (s3Error) {
            console.warn(`Photo not found in S3, but continuing with database deletion: ${s3Error.message}`);
        }

        // Update user's photoUrl array in database (source of truth)
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

        // First, check if user has photos in database (source of truth)
        const user = await User.findById(loggedInUser._id);
        if (!user || !user.photoUrl || user.photoUrl.length === 0) {
            return res.status(400).json({ message: "No photos found in database to delete" });
        }

        // Get photo URLs from database (source of truth)
        const photoUrls = user.photoUrl;
        const deletedKeys = [];
        const s3Errors = [];

        // Try to delete each photo from S3
        for (const photoUrl of photoUrls) {
            try {
                const urlParts = photoUrl.split('/');
                const key = urlParts.slice(3).join('/');
                
                const { deleteObject } = require('../utils/deleteObject');
                await deleteObject(key);
                deletedKeys.push(key);
            } catch (s3Error) {
                console.warn(`Photo not found in S3: ${photoUrl} - ${s3Error.message}`);
                s3Errors.push({ photoUrl, error: s3Error.message });
            }
        }

        // Clear all photos from user's database record (source of truth)
        await User.findByIdAndUpdate(loggedInUser._id, { photoUrl: [] });

        res.json({
            message: "All photos deleted successfully",
            deletedFromDatabase: photoUrls.length,
            deletedFromS3: deletedKeys.length,
            s3Errors: s3Errors.length > 0 ? s3Errors : undefined,
            userId: loggedInUser._id
        });
    } catch (err) {
        console.error("Delete all photos error:", err);
        res.status(400).json({ message: err.message });
    }
});

userRouter.put("/user/edit-photo", userAuth, fileUpload({
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    abortOnLimit: true,
    responseOnLimit: "File size exceeds the 5MB limit"
}), async (req, res) => {
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

        // Update database to keep it in sync with S3
        // Get current user's photos and replace the old URL with new one
        const user = await User.findById(loggedInUser._id);
        if (user && user.photoUrl) {
            const updatedPhotos = user.photoUrl.map(url => 
                url === oldPhotoUrl ? newPhotoUrl : url
            );
            
            await User.findByIdAndUpdate(
                loggedInUser._id,
                { photoUrl: updatedPhotos }
            );
        }

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
        
        const user = await User.findById(loggedInUser._id).select('photoUrl');
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const photoUrls = user.photoUrl || [];
        
        const photos = photoUrls.map((url, index) => ({
            index: index,
            url: url,
            filename: url.split('/').pop()
        }));

        res.json({
            message: "Photos retrieved successfully",
            photoCount: photos.length,
            photos: photos,
            userId: loggedInUser._id
        });
    } catch (err) {
        console.error("Get photos error:", err);
        res.status(400).json({ message: err.message });
    }
});

userRouter.get("/user-verification-status", userAuth, async (req, res) => {
    try {
        const loggedInUser = req.user;
        const user = await User.findById(loggedInUser._id)
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.json({ userId: loggedInUser._id, emailVerified: user.emailVerified, isVerified: user.verified,  verificationInProgress: user.verificationInProgress });
    } catch (err) {
        res.status(500).json({ message: "Error fetching verification status", error: err.message });
    }
})

userRouter.get("/user-selfie-status", userAuth, async (req, res) => {
    try {
        const loggedInUser = req.user;
        const user = await User.findById(loggedInUser._id)
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.json({ userId: loggedInUser._id, selfieStatus: user.clickedPhoto });
    } catch (err) {
        res.status(500).json({ message: "Error fetching selfie status", error: err.message });
    }
})

userRouter.put("/user-verification-in-progress", userAuth, async (req, res) => {
    try {
        const loggedInUser = req.user;
        const { verificationInProgress } = req.body;
        await User.findByIdAndUpdate(loggedInUser._id, { verificationInProgress: verificationInProgress });
        res.json({ message: "Verification in progress updated successfully" });
    } catch (err) {
        res.status(500).json({ message: "Error updating verification in progress", error: err.message });
    }
})

userRouter.put("/user/password-reset-mail-verification", async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ message: "Email is required" });
        }

        const user = await User.findOne({ email: email });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Check if existing OTP is still valid
        if (user.otp && user.otp.otp && user.otp.expiresAt) {
            const now = new Date();
            const expiresAt = new Date(user.otp.expiresAt);
            
            if (now < expiresAt) {
                // OTP is still valid, don't send new email
                const timeLeft = Math.ceil((expiresAt - now) / 1000); // seconds remaining
                const minutesLeft = Math.ceil(timeLeft / 60);
                
                return res.status(400).json({
                    message: "OTP already sent. Please use the existing OTP or wait for it to expire.",
                    timeLeft: timeLeft,
                    minutesLeft: minutesLeft,
                    expiresAt: expiresAt.toISOString(),
                    canResendAfter: expiresAt.toISOString()
                });
            }
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Send email first
        const { sendEmail } = require('../utils/emailService');
        const subject = "Password Reset Verification - Lynk";
        const text = `Hello ${user.firstName},\n\nYou have requested to reset your password. Please use the following verification code:\n\nVerification Code: ${otp}\n\nThis code will expire in 2 minutes.\n\nIf you did not request this password reset, please ignore this email.\n\nBest regards,\nThe Lynk Team`;

        await sendEmail(email, subject, text);

        // Only if email is sent successfully, then do DB operations
        const expiresAt = new Date(Date.now() + 2 * 60 * 1000); // 10 minutes from now

        // Update user's OTP field directly
        user.otp = {
            otp: otp,
            expiresAt: expiresAt
        };
        user.allowPasswordReset = true;
        await user.save();

        res.json({
            message: "Password reset verification email sent successfully",
            email: email,
        });
    } catch (err) {
        console.error("Password reset email error:", err);
        res.status(500).json({ message: "Error sending password reset verification email", error: err.message });
    }
})

// Verify OTP for password reset
userRouter.post("/user/verify-password-reset-otp", async (req, res) => {
    try {
        const { email, otp } = req.body;
        
        if (!email || !otp) {
            return res.status(400).json({ message: "Email and OTP are required" });
        }

        const user = await User.findOne({ email: email });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Check if OTP exists
        if (!user.otp || !user.otp.otp || !user.otp.expiresAt) {
            return res.status(400).json({ 
                message: "No OTP found. Please request a new password reset.",
                valid: false
            });
        }

        // Check if OTP has expired
        const now = new Date();
        const expiresAt = new Date(user.otp.expiresAt);
        
        if (now >= expiresAt) {
            return res.status(400).json({ 
                message: "OTP has expired. Please request a new password reset.",
                valid: false,
                expired: true
            });
        }

        // Check if OTP matches
        if (user.otp.otp !== otp) {
            return res.status(400).json({ 
                message: "Invalid OTP. Please check and try again.",
                valid: false
            });
        }

        // OTP is valid
        user.otp.otp = "";
        user.otp.expiresAt = null;
        await user.save();
        res.json({
            message: "OTP verified successfully",
        });

    } catch (err) {
        console.error("OTP verification error:", err);
        res.status(500).json({ message: "Error verifying OTP", error: err.message });
    }
})

userRouter.post("/user/password-reset", async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        const user = await User.findOne({ email: email });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        
        if (!user.allowPasswordReset) {
            return res.status(400).json({ message: "Password reset not allowed. Please verify OTP first." });
        }
        
        // Hash the new password before storing
        const bcrypt = require('bcrypt');
        const passwordHash = await bcrypt.hash(password, 10);
        user.password = passwordHash;
        user.allowPasswordReset = false;
        await user.save();
        
        // Send confirmation email
        const { sendEmail } = require('../utils/emailService');
        const subject = "Password Reset Successful - Lynk";
        const text = `Hello ${user.firstName},\n\nYour password has been successfully reset.\n\nIf you did not make this change, please contact our support team immediately.\n\nBest regards,\nThe Lynk Team`;
        
        await sendEmail(email, subject, text);
        
        res.json({ message: "Password reset successfully" });
    } catch (err) {
        console.error("Password reset error:", err);
        res.status(500).json({ message: "Error resetting password", error: err.message });
    }
})


module.exports = userRouter;
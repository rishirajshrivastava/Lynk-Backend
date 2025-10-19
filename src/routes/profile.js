const express = require('express');
const profileRouter = express.Router();
const validateEditProfileData = require('../utils/validateEditProfileData');
const User = require('../models/user');

const userAuth = require('../middlewares/auth');
const verifyUser = require('../middlewares/verify');

profileRouter.get("/profile/view", userAuth, async (req,res)=>{
    try{
        const USER_SAFE_DATA = "firstName lastName email photoUrl age gender about skills height weight location occupation education smoking drinking exercise diet hasKids wantsKids about interests hobbies languages _id";
        
        // Extract only safe data from existing user object
        const safeUserData = {};
        const fields = USER_SAFE_DATA.split(' ');
        
        fields.forEach(field => {
            if (req.user[field] !== undefined) {
                safeUserData[field] = req.user[field];
            }
        });
        
        res.json({
            message: "Profile retrieved successfully",
            user: safeUserData
        });
    } catch (err) {
        res.status(500).send("ERROR : " + err.message);
    }
});

profileRouter.patch("/profile/edit", userAuth, verifyUser, async (req,res)=>{
    try {
        if(!validateEditProfileData(req)) {
            res.status(400).send("Invalid edit request");
        }
        const loggedInUser = req.user;
        
        // Check if photoUrl is being updated
        if (req.body.photoUrl) {
            // Get current photos from database
            const currentUser = await User.findById(loggedInUser._id);
            const currentPhotos = currentUser.photoUrl || [];
            const newPhotos = req.body.photoUrl;
            
            // Find photos to delete (in current but not in new)
            const photosToDelete = currentPhotos.filter(photo => !newPhotos.includes(photo));
            
            // Delete old photos from S3
            if (photosToDelete.length > 0) {
                const { deleteObjects } = require('../utils/deleteObject');
                const keysToDelete = photosToDelete.map(photoUrl => {
                    const urlParts = photoUrl.split('/');
                    return urlParts.slice(3).join('/');
                });
                
                try {
                    await deleteObjects(keysToDelete);
                    console.log(`Deleted ${keysToDelete.length} old photos from S3`);
                } catch (s3Error) {
                    console.warn('Error deleting old photos from S3:', s3Error.message);
                }
            }
        }
        
        // Update user fields
        Object.keys(req.body).forEach((field) => {
            loggedInUser[field] = req.body[field]
        });
        
        await loggedInUser.save();
        
        res.json({
            "message": "profile updated successfully",
            "data": loggedInUser
        });
    } catch (err) {
        return res.status(400).send("ERROR : " + err.message);
    }
})

module.exports = profileRouter;
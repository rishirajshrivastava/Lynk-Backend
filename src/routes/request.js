const express = require('express');
const requestRouter = express.Router();
const ConnectionRequest = require('../models/connectionRequest');
const User = require('../models/user');

const userAuth = require('../middlewares/auth');
const verifyUser = require('../middlewares/verify');

const USER_SAFE_DATA = "firstName lastName photoUrl age gender about skills";

requestRouter.post("/request/send/:status/:toUserId", userAuth, verifyUser,  async (req, res, next) => {
    try {
        const currentUser = req.user;
        const fromUserId = currentUser._id;
        const toUserId = req.params.toUserId;
        const status = req.params.status;

        if(JSON.stringify(fromUserId) === JSON.stringify(toUserId) ){
            return res.status(400).json({"message" : "You cannot send a connection request to yourself"});
        }
        const toUser = await User.findById(toUserId);
        if (!toUser) {
            return res.status(404).json({"message" : "User not found"});
        }

        const allowedStatus = ['ignored', 'interested'];
        if(status === 'special-like') {
            return next(); // Pass to the next handler for special-like
        }
        if (!allowedStatus.includes(status)) {
            return res.status(400).json({"message" : "Invalid status type: " + status});
        }

        //if there is an existing connection request
        const existingRequest = await ConnectionRequest.findOne({
            $or: [
                { fromUserId: fromUserId, toUserId: toUserId },
                { fromUserId: toUserId, toUserId: fromUserId }
            ]
        });

        if(existingRequest && existingRequest.status === 'interested' && currentUser.dayLikesCount < 8 && status === 'interested') {
            existingRequest.status = 'accepted';
            currentUser.dayLikesCount++;
            await currentUser.save();
            await existingRequest.save();
            return res.status(200).json({"message" : "You have a match"});
        }

        if(existingRequest && existingRequest.status === 'interested' && currentUser.dayLikesCount < 8 && status === 'ignored') {
            existingRequest.status = 'rejected';
            await existingRequest.save();
            return res.status(200).json({"message" : "You had a chance of matching with this user but you missed it"});
        }

        if(existingRequest && existingRequest.status === 'ignored' && currentUser.dayLikesCount < 8 && status === 'interested') {
            currentUser.dayLikesCount++;
            await currentUser.save();
            return res.status(200).json({"message" : "You have been already rejected by this user"});
        }

        if(existingRequest && existingRequest.status === 'ignored' && status === 'ignored') {
            return res.status(200).json({"message" : "You have been already rejected by this user"});
        }


        const connectionRequest = new ConnectionRequest({
            fromUserId,
            toUserId,
            status
        });
        // Handle interested status with validation and counter increment
        if(status === 'interested') {
            // Check dayLikesCount limit before saving connection request
            if (currentUser.dayLikesCount >= 8) {
                return res.status(400).json({
                    message: "You have reached the maximum like limit per day."
                });
            }
            
            // Save connection request
            const data = await connectionRequest.save();
            
            // Increment dayLikesCount
            await User.findByIdAndUpdate(fromUserId, {
                $inc: { dayLikesCount: 1 }
            });
            
            res.json({
                message: req.user.firstName + " is " + status + " in " + toUser.firstName,
                data: data
            });
        } else if(status === 'ignored') {
            // Save connection request for ignored status
            const data = await connectionRequest.save();
            
            res.json({
                message: req.user.firstName + " has " + status + " " + toUser.firstName,
                data: data
            });
        }
    } catch (err) {
        res.status(400).send("Error : " + err.message);
    }
})

requestRouter.post("/request/review/:status/:requestId", userAuth, verifyUser, async(req,res,next) => {
    try {
        const loggedInUser = req.user;
        const {status , requestId} = req.params
        const { reminderReviewed } = req.query;

        const allowedStatus = ['accepted', 'rejected'];
        if(status === 'special-like') {
            return next(); // Pass to the next handler for special-like
        }
        if(!allowedStatus.includes(status)) {
            return res.status(400).json({"message" : "Invalid status type: " + req.params.status});
        }
        const connectionRequest = await ConnectionRequest.findOne({
            _id: requestId,
            toUserId: loggedInUser._id,
            status: 'interested'
        })
        if(!connectionRequest) {
            return res.status(404).json({"message" : "Connection request not found"});
        }
        connectionRequest.status = status;
        if (reminderReviewed === 'true') {
            connectionRequest.reminderReviewed = true;
        }
        const data = await connectionRequest.save();

        res.json({
            message: loggedInUser.firstName + " has " + status + " the connection request "
        });
    }
    catch (err) {
        res.status(400).send("Error : " + err.message);
    }
})

requestRouter.post("/request/send/special-like/:userId", userAuth, verifyUser, async (req, res) => {
    try {
        const fromUserId = req.user._id;
        const toUserId = req.params.userId;

        // Check if user has special likes remaining
        const currentUser = req.user;
        if (currentUser.specialLikeCount >= 3) {
            return res.status(400).json({
                message: "You have reached the maximum limit of 3 special likes"
            });
        }

        // Check if connection request already exists
        const existingRequest = await ConnectionRequest.findOne({
            $or: [
                { fromUserId, toUserId },
                { fromUserId: toUserId, toUserId: fromUserId }
            ]
        });

        if(existingRequest && existingRequest.status === 'interested' && existingRequest.saved === false) {
            await ConnectionRequest.findByIdAndUpdate(existingRequest._id, {
                $set: {
                    fromUserId: fromUserId,
                    toUserId: toUserId,
                    status: 'accepted',
                    saved: true,
                    reminderSent: false,
                    reminderReviewed: false,
                    savedByboth: false
                }
            });
            currentUser.specialLikeCount++;
            await currentUser.save();
            return res.status(200).json({"message" : "saved this user and it is a match"});
        }

        if(existingRequest && existingRequest.status === 'ignored' && existingRequest.saved === false) {

            console.log('fromuserid: ', fromUserId);
            console.log('touserid: ', toUserId);
            await ConnectionRequest.findByIdAndUpdate(existingRequest._id, {
                $set: {
                    fromUserId: fromUserId,
                    toUserId: toUserId,
                    status: 'rejected',
                    saved: true,
                    reminderSent: false,
                    reminderReviewed: false,
                    savedByboth: false
                }
            });
            currentUser.specialLikeCount++;
            await currentUser.save();
            return res.status(200).json({"message" : "saving user but you have been already rejected by this user"});
        }

        if(existingRequest && existingRequest.status === 'interested' && existingRequest.saved === true) {
            existingRequest.status = 'accepted';
            await existingRequest.save();
            const newRequest = new ConnectionRequest({
                fromUserId: fromUserId, // Note: fromUserId is the target user
                toUserId: toUserId,  // toUserId is the current user
                status: 'accepted',  // Use valid status
                saved: true
            });
            await newRequest.save();
            currentUser.specialLikeCount++;
            await currentUser.save();
            return res.status(200).json({"message" : "its a match"});
        }

        // Create new connection request with saved: true
        const newRequest = new ConnectionRequest({
            fromUserId: fromUserId, // Note: fromUserId is the target user
            toUserId: toUserId,  // toUserId is the current user
            status: 'interested',  // Use valid status
            saved: true
        });

        await newRequest.save();

        // Increment special like count
        await User.findByIdAndUpdate(fromUserId, {
            $inc: { specialLikeCount: 1 }
        });

        res.json({
            message: "Special like sent successfully",
            data: newRequest
        });

    } catch (err) {
        console.error("Special like error:", err);
        res.status(500).json({ message: err.message });
    }
});

// Get user's special like count
requestRouter.get("/user/special-likes", userAuth, verifyUser, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('specialLikeCount');
        res.json({
            data: {
                specialLikeCount: user.specialLikeCount,
                remaining: 5 - user.specialLikeCount
            }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get saved profiles (profiles user liked with ✨)
requestRouter.get("/user/saved-profiles", userAuth, verifyUser, async (req, res) => {
    try {
        const fromUserId = req.user._id;
        const savedRequests = await ConnectionRequest.find({
            fromUserId: fromUserId,
            saved: true
        }).populate('toUserId', USER_SAFE_DATA);


        const savedProfiles = savedRequests.map(req => req.toUserId);

        res.json({
            data: savedProfiles
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

requestRouter.post("/request/reminder/:toUserId", userAuth, verifyUser, async (req, res) => {
    try {
        const { toUserId } = req.params;
        
        // Find the connection request
        const connectionRequest = await ConnectionRequest.findOne({
            fromUserId: req.user._id,
            toUserId: toUserId
        });

        if (!connectionRequest) {
            return res.status(404).json({
                message: "Connection request not found"
            });
        }

        // Check if reminder is already sent
        if (connectionRequest.reminderSent === true) {
            return res.status(400).json({
                message: "Reminder is already sent",
                data: {
                    reminderSent: true,
                    message: "Cannot send reminder again",                    
                }
            });
        }

        // Update reminderSent to true
        const updatedRequest = await ConnectionRequest.findByIdAndUpdate(
            connectionRequest._id,
            { reminderSent: true },
            { new: true }
        );

        res.json({
            message: "Reminder sent successfully",
        });

    } catch (err) {
        console.error("Update reminder error:", err);
        res.status(500).json({ message: err.message });
    }
});

requestRouter.get("/reminder/status/:toUserId", userAuth, verifyUser, async (req, res) => {
    try {
        const { toUserId } = req.params;
        
        // Find the connection request
        const connectionRequest = await ConnectionRequest.findOne({
            fromUserId: req.user._id,
            toUserId: toUserId
        });

        if (!connectionRequest) {
            return res.status(404).json({
                message: "Connection request not found"
            });
        }

        res.json({
            message: "Reminder status retrieved successfully",
            data: {
                reminderSent: connectionRequest.reminderSent,
            }
        });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

requestRouter.get("/reminders/pending", userAuth, verifyUser, async (req, res) => {
    try {
        const loggedInUser = req.user._id;
        
        const pendingReminders = await ConnectionRequest.find({
            toUserId: loggedInUser,
            saved: true,
            reminderSent: true,
            reminderReviewed: false,
            status: 'interested'
        }).populate('fromUserId', USER_SAFE_DATA);

        if (pendingReminders.length === 0) {
            return res.json({
                message: "No pending reminders found",
                data: []
            });
        }

        // If there is data, directly return all users' data
        const usersData = pendingReminders.map(request => ({
            _id: request._id,
            firstName: request.fromUserId.firstName,
            lastName: request.fromUserId.lastName,
            photoUrl: request.fromUserId.photoUrl,
            age: request.fromUserId.age,
            gender: request.fromUserId.gender,
            about: request.fromUserId.about,
            skills: request.fromUserId.skills,
            updatedAt: request.updatedAt
        }));

        res.json({
            message: "Pending reminders retrieved successfully",
            data: usersData
        });

    } catch (err) {
        console.error("Fetch pending reminders error:", err);
        res.status(500).json({ 
            message: "Failed to fetch pending reminders",
            error: err.message 
        });
    }
});

requestRouter.post("/reminder/review/:connectionId", userAuth, verifyUser, async (req, res) => {
    try {

        const { connectionId } = req.params;
        

        const connectionRequest = await ConnectionRequest.findOne({
            _id: connectionId,
            status: 'interested',
            saved: true,    
            reminderSent: true,  
            reminderReviewed: false
        });


        if (!connectionRequest) {
            return res.status(404).json({
                message: "No matching connection request found",                
            });
        }

        const updatedRequest = await ConnectionRequest.findByIdAndUpdate(
            connectionRequest._id,
            { reminderReviewed: true },
        );

        res.json({
            message: "Reminder marked as reviewed successfully",
            data: {
                requestId: updatedRequest._id,
                fromUserId: updatedRequest.fromUserId,
                toUserId: updatedRequest.toUserId,
            }
        });

    } catch (err) {
        console.error("Mark reminder reviewed error:", err);
        res.status(500).json({ 
            message: "Failed to mark reminder as reviewed",
            error: err.message 
        });
    }
});

requestRouter.get("/request/status/:toUserId" , userAuth, verifyUser, async (req, res) => {
    try {
        const { toUserId } = req.params;
        const fromUserId = req.user._id;

        const connectionRequest = await ConnectionRequest.findOne({
            fromUserId: fromUserId,
            toUserId: toUserId
        });
        if (!connectionRequest) {
            return res.json({
                message: "No connection request found",
                data: null
            });
        }
        res.json({
            message: "Connection request status retrieved",
            data: {
                status: connectionRequest.status,
            }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

requestRouter.post("/request/block/:toUserId", userAuth, verifyUser, async (req, res) => {
    try {
        const { toUserId } = req.params;
        const fromUser = req.user;
        const connectionRequest = await ConnectionRequest.findOne({
            $or: [
                { fromUserId: fromUser._id, toUserId: toUserId },
                { fromUserId: toUserId, toUserId: fromUser._id }
            ]
        });
        if (!connectionRequest) {
            return res.status(404).json({
                message: "No connection request found",
                data: null
            });
        }
        connectionRequest.status = 'blocked';
        fromUser.hasBlocked.push(toUserId);
        await fromUser.save();
        await connectionRequest.save();
        res.json({
            message: "User blocked successfully",
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = requestRouter;
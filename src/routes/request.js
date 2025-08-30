const express = require('express');
const requestRouter = express.Router();
const ConnectionRequest = require('../models/connectionRequest');
const User = require('../models/user');

const userAuth = require('../middlewares/auth');

const USER_SAFE_DATA = "firstName lastName photoUrl age gender about skills";

requestRouter.post("/request/send/:status/:toUserId", userAuth,  async (req, res, next) => {
    try {
        const fromUserId = req.user._id;
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
        console.log(status)
        if(status === 'special-like') {
            return next(); // Pass to the next handler for special-like
        }
        if (!allowedStatus.includes(status)) {
            return res.status(400).json({"message" : "Invalid status typebbbbb: " + status});
        }

        //if there is an existing connection request
        const existingRequest = await ConnectionRequest.findOne({
            $or: [
                { fromUserId: fromUserId, toUserId: toUserId },
                { fromUserId: toUserId, toUserId: fromUserId }
            ]
        });

        if(existingRequest) {
            return res.status(400).json({"message" : "Connection request already exists"});
        }

        const connectionRequest = new ConnectionRequest({
            fromUserId,
            toUserId,
            status
        });
        const data = await connectionRequest.save();
        if(status === 'interested') {
            res.json({
                message: req.user.firstName + " is " + status + " in " + toUser.firstName,
                data: data
            });
        } else if( status === 'ignored') {
            res.json({
                message: req.user.firstName + " has " + status + " " + toUser.firstName,
                data: data
            });
        }
    } catch (err) {
        res.status(400).send("Error : " + err.message);
    }
})

requestRouter.post("/request/review/:status/:requestId", userAuth, async(req,res,next) => {
    try {
        console.log('dfgbfeibgeg');
        const loggedInUser = req.user;
        const {status , requestId} = req.params

        const allowedStatus = ['accepted', 'rejected'];
        if(status === 'special-like') {
            return next(); // Pass to the next handler for special-like
        }
        if(!allowedStatus.includes(status)) {
            return res.status(400).json({"message" : "Invalid status typeaaaa: " + req.params.status});
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
        const data = await connectionRequest.save();

        res.json({
            message: loggedInUser.firstName + " has " + status + " the connection request "
        });
    }
    catch (err) {
        res.status(400).send("Error : " + err.message);
    }
    

})

requestRouter.post("/request/send/special-like/:userId", userAuth, async (req, res) => {
    try {
        const fromUserId = req.user._id;
        const toUserId = req.params.userId;

        console.log(fromUserId);  

        // Check if user has special likes remaining
        const currentUser = await User.findById(fromUserId);
        if (currentUser.specialLikeCount >= 5) {
            return res.status(400).json({
                message: "You have reached the maximum limit of 5 special likes"
            });
        }

        // Check if connection request already exists
        const existingRequest = await ConnectionRequest.findOne({
            $or: [
                { fromUserId, toUserId },
                { fromUserId: toUserId, toUserId: fromUserId }
            ]
        });

        if (existingRequest) {
            return res.status(400).json({
                message: "Connection request already exists"
            });
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
requestRouter.get("/user/special-likes", userAuth, async (req, res) => {
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
requestRouter.get("/user/saved-profiles", userAuth, async (req, res) => {
    try {
        const fromUserId = req.user._id;
        const savedRequests = await ConnectionRequest.find({
            fromUserId: fromUserId,
            saved: true
        }).populate('toUserId', USER_SAFE_DATA);

        console.log(fromUserId);

        const savedProfiles = savedRequests.map(req => req.toUserId);

        res.json({
            data: savedProfiles
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = requestRouter;
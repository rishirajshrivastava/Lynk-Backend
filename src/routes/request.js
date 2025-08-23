const express = require('express');
const requestRouter = express.Router();
const ConnectionRequest = require('../models/connectionRequest');
const User = require('../models/user');

const userAuth = require('../middlewares/auth');

requestRouter.post("/request/send/:status/:toUserId", userAuth,  async (req, res) => {
    try {
        const fromUserId = req.user._id;
        const toUserId = req.params.toUserId;
        const status = req.params.status;

        console.log(fromUserId, toUserId);
        if(JSON.stringify(fromUserId) === JSON.stringify(toUserId) ){
            return res.status(400).json({"message" : "You cannot send a connection request to yourself"});
        }
        const toUser = await User.findById(toUserId);
        if (!toUser) {
            return res.status(404).json({"message" : "User not found"});
        }

        const allowedStatus = ['ignored', 'interested'];
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

requestRouter.post("/request/review/:status/:requestId", userAuth, async(req,res) => {
    try {
        const loggedInUser = req.user;
        const {status , requestId} = req.params

        const allowedStatus = ['accepted', 'rejected'];
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
        const data = await connectionRequest.save();

        res.json({
            message: loggedInUser.firstName + " has " + status + " the connection request "
        });
    }
    catch (err) {
        res.status(400).send("Error : " + err.message);
    }
    

})

module.exports = requestRouter;
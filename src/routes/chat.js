const express = require('express');
const chatRouter = express.Router();
const userAuth = require('../middlewares/auth');
const { Chat } = require('../models/chat');

chatRouter.get("/chat/:targetUserId", userAuth, async(req, res) => {
    try {
        const loggedInUser = req.user;
        const targetUserId = req.params.targetUserId;
        let chat = await Chat.findOne({
            participants: { $all: [loggedInUser._id, targetUserId] }
        }).populate({
            path: "messages.sender",
            select: "firstName lastName"
        });
        if(!chat) {
            chat = await new Chat({
                participants: [loggedInUser._id, targetUserId],
                messages: []
            });
            await chat.save();
        }
        res.json({chat});
    } catch (error) {
        res.status(500).send("Error: " + error.message);
    }
})


module.exports = chatRouter;
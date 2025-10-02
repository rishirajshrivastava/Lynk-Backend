const socket = require('socket.io');
const crypto = require('crypto');
const { Chat } = require('../models/chat');
const ConnectionRequest = require('../models/connectionRequest');

const getSecretoomId = (userId, targetUserId) => {
    return crypto.createHash("sha256").update([userId, targetUserId].sort().join("_")).digest("hex");
}

const initializeSocket = (server) => {
    const io = socket(server, {
        cors: {
            origin: "http://localhost:5173",
            credentials: true,
        },
    });
    io.on('connection', (socket) => {
        socket.on("joinChat", ({userId, targetUserId}) => {
            const roomId = getSecretoomId(userId, targetUserId);
            console.log("joining room", roomId);
            socket.join(roomId);

        });
        socket.on("sendMessage", async ({firstName, userId , targetUserId ,newMessage}) => {
            try {
                const connection = await ConnectionRequest.findOne({
                    $or: [
                        { fromUserId: userId, toUserId: targetUserId },
                        { fromUserId: targetUserId, toUserId: userId }
                    ],
                    status: 'accepted'
                });
                if(!connection) {
                    return res.status(400).json({ message: "Connection not found" });
                }
                const roomId = getSecretoomId(userId, targetUserId);
                console.log("sending message to room", roomId , "with message", newMessage, "from user", firstName);
                let chat = await Chat.findOne({
                    participants : {
                        $all : [userId, targetUserId]
                    }
                });
                if(!chat) {
                    chat = await new Chat({
                        participants : [userId, targetUserId],
                        messages : []
                    });
                }
                chat.messages.push({
                    sender : userId,
                    text : newMessage
                });
                await chat.save();
                socket.to(roomId).emit("messageReceived", {firstName, newMessage});
            } catch (error) {
                console.log("error saving message to database", error);
            }
            
        });
        socket.on("disconnect", () => {
        });
    });
}

module.exports = initializeSocket;
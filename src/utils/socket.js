const socket = require('socket.io');
const crypto = require('crypto');

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
        socket.on("sendMessage", ({firstName, userId , targetUserId ,newMessage}) => {
            const roomId = getSecretoomId(userId, targetUserId);
            console.log("sending message to room", roomId , "with message", newMessage, "from user", firstName);
            socket.to(roomId).emit("messageReceived", {firstName, newMessage});
        });
        socket.on("disconnect", () => {
        });

    });
}

module.exports = initializeSocket;
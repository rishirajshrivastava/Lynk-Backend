const mongoose = require('mongoose');

const connectDB = async () => {
    await mongoose.connect(
        "mongodb+srv://shrivastavarishiraj9:WmiQYY38sUPutTUV@cluster0.ybp4jpc.mongodb.net/lynk"
    ); 
}

module.exports = connectDB;
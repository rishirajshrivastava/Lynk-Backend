const mongoose = require('mongoose');

const connectDB = async () => {
    await mongoose.connect(
        "mongodb+srv://shrivastavarishiraj9:Rishiraj%401608@cluster0.ybp4jpc.mongodb.net/lynk"
    ); 
}

module.exports = connectDB;
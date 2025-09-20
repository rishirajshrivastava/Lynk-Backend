const mongoose = require('mongoose');

const connectDB = async () => {
    console.log('DB_CONNECTION_STRING:', process.env.DB_CONNECTION_STRING);
    await mongoose.connect(process.env.DB_CONNECTION_STRING); 
}

module.exports = connectDB;
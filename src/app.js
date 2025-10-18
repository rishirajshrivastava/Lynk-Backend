const express = require('express');
const connectDB = require('./config/database');
const app = express();
const cookieParser = require('cookie-parser');
const cors = require("cors");
require('dotenv').config();
require('./utils/cronJob');
const http = require('http');
const initializeSocket = require('./utils/socket');

app.use(cors({
    origin: "http://localhost:5173",
    credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

const authRouter = require('./routes/auth');
const profileRouter = require('./routes/profile');
const requestRouter = require('./routes/request');
const userRouter = require('./routes/user');
const chatRouter = require('./routes/chat');
const emailRouter = require('./routes/sendEmail');

app.use("/", authRouter, profileRouter, requestRouter, userRouter, chatRouter, emailRouter);

const server = http.createServer(app);
initializeSocket(server);

connectDB().then(()=>{
    console.log('Connected to database');
    server.listen(process.env.PORT, () => { 
        console.log('Server is running on port 3000');   
});
}).catch(err=>{
    console.log('Error connecting to database:', err);
})
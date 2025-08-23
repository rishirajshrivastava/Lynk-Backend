const express = require('express');
const connectDB = require('./config/database');
const app = express();
const cookieParser = require('cookie-parser');

app.use(express.json());
app.use(cookieParser());

const authRouter = require('./routes/auth');
const profileRouter = require('./routes/profile');
const requestRouter = require('./routes/request');
const userRouter = require('./routes/user');

app.use("/", authRouter, profileRouter, requestRouter, userRouter);

connectDB().then(()=>{
    console.log('Connected to database successfully');
    app.listen(3000, () => {    
    console.log('Server is running on port 3000');
});
}).catch(err=>{
    console.log('Error connecting to database:', err);
})
const express = require('express');
const connectDB = require('./config/database');
const User = require('./models/user');
const app = express();
const bcrypt = require('bcrypt');
const validator = require('validator');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const checkPasswordStrength = require('./utils/checkPasswordStrength');
const userAuth = require('./middlewares/auth');

app.use(express.json());
app.use(cookieParser());

app.post("/signup",async (req,res)=>{
    // ENCRYPT THE PASSWORD
    const {firstName,lastName,email,password,age,about,gender,skills,photoUrl} = req.body;
    const errors= checkPasswordStrength(password);
    if (errors.length > 0) {
        return res.status(400).send("Password must contain: " + errors.join(", "));
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = new User({
        firstName,
        lastName,
        email,
        password: passwordHash,
        age,
        gender,
        photoUrl,
        about,
        skills
    });
    try{
        const allowedParams = ["id", "firstName", "lastName", "password", "gender", "photoUrl", "about", "skills","email", "age"];
        const isValidOperation = Object.keys(req.body).every((update) => allowedParams.includes(update));
        if (!isValidOperation) {
            throw new Error("User cannot be registered");
        }
        await user.save();
        res.send("user added successfully");
    } catch (err) {
        res.status(500).send("Error saving user. "+ err.message);
    }
})

app.post("/login",async (req,res)=>{
    try {
        const {email,password} = req.body;
        if(!validator.isEmail(email)) {
            throw new Error("Invalid email");
        }
        const user = await (User.findOne({email: req.body.email}));
        if(!user || user.length === 0) {
            throw new Error("Invalid credentials");
        } else {
            const encryptedPassword = user.password;
            const isPasswordValid = await user.validatePassword(password, encryptedPassword);
            if(!isPasswordValid) {
                throw new Error("Invalid credentials");
            }
            if(isPasswordValid) {
                //create jwt token, attach it to cookie and send the resposne back to user
                const token =  await user.getJWT();
                res.cookie("token", token);
            }
            res.send("User logged in successfully");
        }
    } catch (err) {
        res.status(500).send("Error logging in user. " + err.message);
    }
});

app.get("/profile", userAuth, async (req,res)=>{
    try{
        res.send(req.user);
    } catch (err) {
        res.status(500).send("ERROR : " + err.message);
    }
    
});

app.post("/sendConnectionRequest", userAuth,  async (req, res) => {
    const user = req.user;
    res.send(user.firstName + " is sending a connection request ");
})

connectDB().then(()=>{
    console.log('Connected to database successfully');
    app.listen(3000, () => {    
    console.log('Server is running on port 3000');
});
}).catch(err=>{
    console.log('Error connecting to database:', err);
})

const express = require('express');
const authRouter = express.Router();
const bcrypt = require('bcrypt');
const User = require('../models/user');
const validator = require('validator');
const checkPasswordStrength = require('../utils/checkPasswordStrength');

authRouter.post("/signup",async (req,res)=>{
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

authRouter.post("/login",async (req,res)=>{
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

authRouter.post("/logout", async (req, res) => {
    try {
        res.clearCookie("token");
        res.send("User logged out successfully");
    } catch (err) {
        res.status(500).send("Error logging out user. " + err.message);
    }
})

module.exports = authRouter;
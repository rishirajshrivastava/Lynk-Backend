const express = require('express');
const authRouter = express.Router();
const bcrypt = require('bcrypt');
const User = require('../models/user');
const validator = require('validator');
const checkPasswordStrength = require('../utils/checkPasswordStrength');

authRouter.post("/signup",async (req,res)=>{
    const {
        firstName, lastName, email, password, age, dateOfBirth, gender, interestedIn,
        height, weight, bodyType, ethnicity,
        religion, politicalViews, phoneNumber,
        location, distancePreference, occupation, education, income, smoking, drinking, exercise, diet,
        relationshipStatus, lookingFor, hasKids, wantsKids, zodiacSign,
        about, interests, hobbies, languages, photoUrl
    } = req.body;

    if (!firstName || !email || !password || !gender) {
        return res.status(400).json({ 
            error: "Missing required fields",
            details: "First name, email, password, and gender are required"
        });
    }

    // Validate skills/interests array length
    if (Array.isArray(interests) && interests.length > 20) {
        return res.status(400).json({ message: "You can add a maximum of 20 interests." });
    }
    if (Array.isArray(hobbies) && hobbies.length > 15) {
        return res.status(400).json({ message: "You can add a maximum of 15 hobbies." });
    }
    if (Array.isArray(languages) && languages.length > 10) {
        return res.status(400).json({ message: "You can add a maximum of 10 languages." });
    }
    if (Array.isArray(photoUrl) && photoUrl.length > 6) {
        return res.status(400).json({ message: "You can add a maximum of 6 photos." });
    }

    const errors = checkPasswordStrength(password);
    if (errors.length > 0) {
        return res.status(400).json({
            error: "Weak Password",
            details: "Password must contain: " + errors.join(", ")
        });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    
    const userData = {
        firstName,
        lastName,
        email,
        password: passwordHash,
        gender,
        interestedIn: interestedIn || ["everyone"],
        photoUrl: photoUrl || []
    };

    // Add optional fields only if they exist
    if (age) userData.age = age;
    if (dateOfBirth) userData.dateOfBirth = new Date(dateOfBirth);
    if (height) userData.height = height;
    if (weight) userData.weight = weight;
    if (bodyType) userData.bodyType = bodyType;
    if (ethnicity) userData.ethnicity = ethnicity;
    if (religion) userData.religion = religion;
    if (politicalViews) userData.politicalViews = politicalViews;
    if (phoneNumber) userData.phoneNumber = phoneNumber;
    if (location) userData.location = location;
    if (distancePreference) userData.distancePreference = distancePreference;
    if (occupation) userData.occupation = occupation;
    if (education) userData.education = education;
    if (income) userData.income = income;
    if (smoking) userData.smoking = smoking;
    if (drinking) userData.drinking = drinking;
    if (exercise) userData.exercise = exercise;
    if (diet) userData.diet = diet;
    if (relationshipStatus) userData.relationshipStatus = relationshipStatus;
    if (lookingFor) userData.lookingFor = lookingFor;
    if (hasKids) userData.hasKids = hasKids;
    if (wantsKids) userData.wantsKids = wantsKids;
    if (zodiacSign) userData.zodiacSign = zodiacSign;
    if (about) userData.about = about;
    if (interests) userData.interests = interests;
    if (hobbies) userData.hobbies = hobbies;
    if (languages) userData.languages = languages;

    const user = new User(userData);
    
    try{
        const allowedParams = [
            "firstName", "lastName", "email", "password", "age", "dateOfBirth", "gender", "interestedIn",
            "height", "weight", "bodyType", "ethnicity", "religion", "politicalViews", "phoneNumber",
            "location", "distancePreference", "occupation", "education", "income", "smoking", "drinking", 
            "exercise", "diet", "relationshipStatus", "lookingFor", "hasKids", "wantsKids", "zodiacSign",
            "about", "interests", "hobbies", "languages", "photoUrl"
        ];
        const isValidOperation = Object.keys(req.body).every((update) => allowedParams.includes(update));
        if (!isValidOperation) {
            throw new Error("User cannot be registered");
        }
        await user.save();
        return res.status(200).json({ message: "user added successfully" });
    } catch (err) {
        res.status(500).json({ 
            success: false,
            message: "Error saving user.",
            error: err.message 
        });
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
            res.json({"user": user});
        }
    } catch (err) {
        res.status(500).json({"Error": err.message});
    }
});

authRouter.post("/logout", async (req, res) => {
    try {
        res.clearCookie("token");
        res.json({"message": "User logged out successfully"});
    } catch (err) {
        res.status(500).json({"Error": err.message});
    }
})

module.exports = authRouter;
const express = require('express');
const profileRouter = express.Router();
const validateEditProfileData = require('../utils/validateEditProfileData');

const userAuth = require('../middlewares/auth');

profileRouter.get("/profile/view", userAuth, async (req,res)=>{
    try{
        res.send(req.user);
    } catch (err) {
        res.status(500).send("ERROR : " + err.message);
    }
});

profileRouter.patch("/profile/edit", userAuth, async (req,res)=>{
    try {
        if(!validateEditProfileData(req)) {
            res.status(400).send("Invalid edit request");
        }
        const loggedInUser = req.user;
        console.log(loggedInUser);
        
        Object.keys(req.body).forEach((field) => {
            loggedInUser[field] = req.body[field]
        });
        await loggedInUser.save();
        res.json({
            "message": "profile updated successfully",
            "data": loggedInUser
        });
    } catch (err) {
        return res.status(400).send("ERROR : " + err.message);
    }
})

module.exports = profileRouter;
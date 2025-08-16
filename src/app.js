const express = require('express');
const connectDB = require('./config/database');
const User = require('./models/user');
const app = express();
const bcrypt = require('bcrypt');
const validator = require('validator');

app.use(express.json());

app.post("/signup",async (req,res)=>{
    // ENCRYPT THE PASSWORD
    const {firstName,lastName,email,password,age,about,gender,skills,photoUrl} = req.body;
    const passwordHash = await bcrypt.hash(password, 10);
    console.log("Password Hash:", passwordHash);
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
        const user = await (User.find({email: req.body.email}))
        if(!user || user.length === 0) {
            throw new Error("Invalid credentials");
        }else {
            const encryptedPassword = user[0].password;
            const isPasswordValid = await bcrypt.compare(password, encryptedPassword);
            if(!isPasswordValid) {
                throw new Error("Invalid credentials");
            }
            res.send("User logged in successfully");
        }
    } catch (err) {
        res.status(500).send("Error logging in user. " + err.message);
    }
});

app.get("/feed",async(req,res)=>{
    try {
        const user = await User.find();
        if(user.length === 0) {
            return res.status(404).send("No users found");
        }
        res.send(user);
    } catch (err) {
        res.status(500).send("Error fetching users: " + err.message);
    }
})

app.get("/user",async(req,res)=>{
    try {
        const user = await User.find({email: req.body.email});
        if(user.length === 0) {
            return res.status(404).send("No user found with this email");
        }
        res.send(user);
    } catch (err) {
        res.status(500).send("Error fetching users");
    }
})

app.delete("/user/:id",async(req,res)=>{
    const userId = req.params.id;
    console.log("User ID to delete:", userId);
    try {
        await User.findByIdAndDelete(userId);
        res.send("User deleted successfully");
    } catch (err) {
        return res.status(500).send("Error deleting user");
    }
})

app.patch("/user/:userId", async(req,res)=>{
    const data = req.body;
    try {
        const allowedUpdates = ["firstName", "lastName", "password", "gender", "photoUrl", "about", "skills"];
    const isValidOperation = Object.keys(data).every((update) => allowedUpdates.includes(update));
    if (!isValidOperation) {
        throw new error("Update not allowed");
    }
    if(data?.skills?.length > 10 ) {
        throw new Error("Skills cannot be more than 10");
    }
        await User.findByIdAndUpdate(req.params?.userId, data, { runValidators: true });
        res.send("User updated successfully");
    } catch (err) {
        return res.status(500).send("Error updating user. " + err.message);
    }
})

connectDB().then(()=>{
    console.log('Connected to database successfully');
    app.listen(3000, () => {    
    console.log('Server is running on port 3000');
});
}).catch(err=>{
    console.log('Error connecting to database:', err);
})

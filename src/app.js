const express = require('express');
const connectDB = require('./config/database');
const User = require('./models/user');
const app = express();

app.use(express.json());

app.post("/signup",async (req,res)=>{
    const user = new User(req.body);
    try{
        await user.save();
        res.send("user added successfully");
    } catch (err) {
        res.status(500).send("Error saving user"+ err.message);
    }
})

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
        res.status(500).send("Error fetching users: " + err.message);
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

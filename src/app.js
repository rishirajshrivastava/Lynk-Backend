const express = require('express');
const connectDB = require('./config/database');
const User = require('./models/user');
const app = express();

app.post("/signup",async (req,res)=>{
    const userObj = {
        firstName: "viart",
        lastName: "kohli",
        email: "kohliavi@gmail.com",
        password: "kohli123",
        age: 25,
        gender: "male"
    }
    //creating a new instance of User model
    const user = new User(userObj);
    try{
        await user.save();
        res.send("user added successfully");
    } catch (err) {
        res.status(500).send("Error saving user"+ err.message);
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

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

connectDB().then(()=>{
    console.log('Connected to database successfully');
    app.listen(3000, () => {    
    console.log('Server is running on port 3000');
});
}).catch(err=>{
    console.log('Error connecting to database:', err);
})

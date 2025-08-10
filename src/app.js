const express = require('express');

const app = express();
app.listen(3000, () => {

    app.use("/test",(req,res) =>{
        res.send('test!');
    })
    app.use("/hello",(req,res) =>{
        res.send('Hello, World!');
    })
    app.use("/",(req,res) =>{
        res.send('gtyhsrth');
    })
    console.log('Server is running on port 3000');
});
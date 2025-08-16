
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const userAuth = async(req,res,next) => {
    try {
        //read token from user cookies and validate the token
        const {token} = req.cookies;
        if(!token) {
            return res.status(401).send("Please login");
        }
        const decodedObj = await jwt.verify(token, "Dev@1608");
        const {_id} = decodedObj;
        const user = await User.findById(_id);
        if(!user) {
            throw new Error("User not found");
        }
        req.user = user;
        next();
    } catch (err) {
        res.status(500).send("ERROR: " + err.message);
    }
}

module.exports = userAuth;
const User = require('../models/user');
const verifyUser = async(req,res,next) => {
    try {
        const user = req.user;
        if(user.verified){
            next();
            return;
        }
        res.status(400).send("User not verified");
    } catch (err) {
        res.status(500).send("ERROR: " + err.message);
    }
}

module.exports = verifyUser;
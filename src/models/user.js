const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        validate(value) {
            if(!validator.isEmail(value)) {
                throw new Error("Email is not valid " + value);
            }
        }
    },
    password: {
        type: String,
        required: true,
        minlength: 6,
    },
    age: {
        type: Number,
        min : 18
    },
    gender: {
        type: String,
        validate(value) {
            if(!["male","female","others"].includes(value)){
                throw new Error("Gender must be either male female or others")
            }
        }
    },
    photoUrl: {
        type: String,
        default: "https://media.licdn.com/dms/image/v2/D4D03AQHaI_6uAY-Bow/profile-displayphoto-shrink_200_200/profile-displayphoto-shrink_200_200/0/1675358757547?e=2147483647&v=beta&t=VX9A6jEjn9CsYzvXlJeDCiqml29FiVMwY2-F8kY23sA",
        validate(value) {
            if(!validator.isURL(value)) {
                throw new Error("URL is not valid " + value);
            }
        }
    },
    about: {
        type: String,
        default: "this is a default about of the user"
    },
    skills: {
        type: [String],
        lowercase: true,
        validate(value) {
            const uniqueSkills = new Set();
            value.forEach(skill =>{
                uniqueSkills.add(skill.trim().toLowerCase());
            })
            if (uniqueSkills.size !== value.length) {
                throw new Error("Skills cannot be duplicate");
            }
        }
    }
}, {timestamps: true});

userSchema.methods.getJWT = async function() {
    const user = this;
    const token = await jwt.sign({_id: user._id},"Dev@1608",{ expiresIn: "7d"});
    return token;
};

userSchema.methods.validatePassword = async function(password, encryptedPassword) {
    const isPasswordValid = await bcrypt.compare(password, encryptedPassword);
    return isPasswordValid;

}

module.exports = mongoose.model("User", userSchema);
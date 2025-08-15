const mongoose = require('mongoose');
const validator = require('validator');
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
        validate(value) {
            const hasLowercase = /[a-z]/.test(value);
            const hasUppercase = /[A-Z]/.test(value);
            const hasDigit = /\d/.test(value);
            const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(value);
            if (!(hasLowercase && hasUppercase && hasDigit && hasSpecial)) {
                throw new Error("Password must contain at least one lowercase letter, one uppercase letter, one digit, and one special character");
            }
        }
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

module.exports = mongoose.model("User", userSchema);
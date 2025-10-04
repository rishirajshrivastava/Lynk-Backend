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
            if(!["male","female","other","prefer-not-to-say"].includes(value)){
                throw new Error("Gender must be either male female or others")
            }
        }
    },
    photoUrl: {
        type: [String],
        default: [],
    },
    clickedPhoto : {
        type: String,
        default: "",
    },
    verified : {
        type: Boolean,
        default: false,
    },
    verificationInProgress : {
        type: Boolean,
        default: false,
    },
    about: {
        type: String,
        default: ""
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
    },
    specialLikeCount: {
        type: Number,
        default: 0,
        min: 0,
        max: 3,
        validate: {
            validator: function(value) {
                return value >= 0 && value <= 3;
            },
            message: 'Special like count must be between 0 and 3'
        }
    },
    dayLikesCount: {
        type: Number,
        default: 0,
        min: 0,
        max: 8,
        validate: {
            validator: function(value) {
                return value >= 0 && value <= 8;
            },
            message: 'Day likes count must be between 0 and 8'
        }
    }
}, {timestamps: true});

// Index for efficient cron job queries
userSchema.index({ dayLikesCount: 1, _id: 1 });

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
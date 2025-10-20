const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const otpSchema = new mongoose.Schema({
    otp: {
        type: String,
        default: "",
    },
    expiresAt: {
        type: Date,
        default: null,
    }
}, { timestamps: true });

const reportSchema = new mongoose.Schema({
    toUserId: {
        type: mongoose.Schema.Types.ObjectId,
    },
    reason: {
        type: String
    },
    details: {
        type: String,
        default: ""
    }
})

const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 50
    },
    lastName: {
        type: String,
        trim: true,
        maxlength: 50
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
    phoneNumber: {
        type: String,
        unique: true,
        sparse: true,
        validate(value) {
            if (value && !validator.isMobilePhone(value)) {
                throw new Error("Phone number is not valid");
            }
        }
    },
    age: {
        type: Number,
        min: 18,
        max: 100
    },
    dateOfBirth: {
        type: Date,
        validate(value) {
            const age = Math.floor((new Date() - value) / (365.25 * 24 * 60 * 60 * 1000));
            if (age < 18) {
                throw new Error("Must be at least 18 years old");
            }
        }
    },
    gender: {
        type: String,
        enum: ["male", "female", "non-binary", "other", "prefer-not-to-say"],
        required: true
    },
    interestedIn: {
        type: [String],
        enum: ["male", "female", "non-binary", "other", "everyone"],
        default: ["everyone"]
    },
    height: {
        type: Number, // in cm
        min: 100,
        max: 250
    },
    weight: {
        type: Number, // in kg
        min: 30,
        max: 200
    },
    bodyType: {
        type: String,
        enum: [
            "slim", "athletic", "average", "curvy", "plus-size", "prefer-not-to-say"
        ]
    },
    ethnicity: {
        type: String,
        enum: [
            "asian", "black", "hispanic", "middle-eastern", "native-american", 
            "pacific-islander", "white", "mixed-race", "other", "prefer-not-to-say"
        ]
    },
    religion: {
        type: String,
        enum: ["christian", "muslim", "hindu", "buddhist", "jewish", "sikh", "atheist", "agnostic", "spiritual", "other", "prefer-not-to-say"]
    },
    politicalViews: {
        type: String,
        enum: ["very-liberal", "liberal", "moderate", "conservative", "very-conservative", "other", "prefer-not-to-say"]
    },

    // Location & Lifestyle
    location: {
        city: { type: String, trim: true },
        state: { type: String, trim: true },
        country: { type: String, trim: true },
        coordinates: {
            latitude: { type: Number },
            longitude: { type: Number }
        },
        timezone: { type: String }
    },
    distancePreference: {
        type: Number, // in km
        default: 50,
        min: 1,
        max: 500
    },
    occupation: {
        type: String,
        trim: true,
        maxlength: 100
    },
    education: {
        type: String,
        enum: [
            "none", "school", "undergraduate", "postgraduate", "doctorate", "other"
        ]
    },
    income: {
        type: String,
        enum: [
            "under-30k", "30k-50k", "50k-75k", "75k-100k", "above-100k", "prefer-not-to-say"
        ]
    },
    smoking: {
        type: String,
        enum: ["never", "occasionally", "regularly", "prefer-not-to-say"]
    },
    drinking: {
        type: String,
        enum: ["never", "occasionally", "regularly", "prefer-not-to-say"]
    },
    exercise: {
        type: String,
        enum: ["never", "occasionally", "regularly", "daily", "prefer-not-to-say"]
    },
    diet: {
        type: String,
        enum: ["omnivore", "vegetarian", "vegan", "pescatarian", "keto", "paleo", "other", "prefer-not-to-say"]
    },

    // Relationship & Dating
    relationshipStatus: {
        type: String,
        enum: [
            "single", "dating", "in-a-relationship", "engaged", "married", 
            "divorced", "separated", "widowed", "prefer-not-to-say"
        ]
    },
    lookingFor: {
        type: [String],
        enum: ["casual-dating", "serious-relationship", "marriage", "friendship", "hookup", "not-sure"]
    },
    hasKids: {
        type: String,
        enum: ["no", "yes-living-with-me", "yes-not-living-with-me", "prefer-not-to-say"]
    },
    wantsKids: {
        type: String,
        enum: ["no", "yes", "maybe", "prefer-not-to-say"]
    },
    zodiacSign: {
        type: String,
        enum: ["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces", "prefer-not-to-say"]
    },

    // Profile Content
    about: {
        type: String,
        maxlength: 500,
        default: ""
    },
    interests: {
        type: [String],
        maxlength: 20
    },
    hobbies: {
        type: [String],
        maxlength: 15
    },
    languages: {
        type: [String],
        maxlength: 10
    },
    photoUrl: {
        type: [String],
        default: [],
        maxlength: 6
    },
    verified: {
        type: Boolean,
        default: false
    },
    verificationInProgress: {
        type: Boolean,
        default: false
    },
    phoneVerified: {
        type: Boolean,
        default: false
    },
    emailVerified: {
        type: Boolean,
        default: false
    },
    otp: {
        type: otpSchema,
        default: {
            otp: "",
            expiresAt: ""
        }
    },
    ageRange: {
        min: { type: Number, default: 18, min: 18 },
        max: { type: Number, default: 100, max: 100 }
    },
    maxDistance: {
        type: Number,
        default: 50,
        min: 1,
        max: 500
    },
    pauseProfile: {
        type: Boolean,
        default: false
    },
    specialLikeCount: {
        type: Number,
        default: 0,
        min: 0,
        max: 3
    },
    dayLikesCount: {
        type: Number,
        default: 0,
        min: 0,
        max: 8
    },
    lastActive: {
        type: Date,
        default: Date.now
    },
    isOnline: {
        type: Boolean,
        default: false
    },
    premiumMember: {
        type: Boolean,
        default: false
    },
    premiumExpiry: {
        type: Date
    },
    clickedPhoto: {
        type: String,
        default: ""
    },
    isBanned: {
        type: Boolean,
        default: false
    },
    banReason: {
        type: String
    },
    reportedCount: {
        type: Number,
        default: 0
    },
    hasBlocked: {
        type: [String],
        default: []
    },
    hasReported: {
        type: [reportSchema],
        default: []
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
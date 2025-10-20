const mongoose = require('mongoose');
const connectionRequestSchema = new mongoose.Schema({
    fromUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    toUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    status: {
        type: String,
        required: true,
        enum:{
            values: ['ignored', 'interested', 'accepted', 'rejected','special-like','blocked'],
            message: `{VALUE} is not a valid status`
        },
    },
    saved: {
        type: Boolean,
        default: false
    },
    reminderSent: {
        type: Boolean,
        default: false
    },
    reminderReviewed: {
        type: Boolean,
        default: false
    },
    savedByBoth: {
        type: Boolean,
        default: false
    }
},
{timestamps: true});

connectionRequestSchema.index({ fromUserId: 1, toUserId: 1 });

const ConnectionRequestModel = new mongoose.model('ConnectionRequests', connectionRequestSchema);
module.exports = ConnectionRequestModel;
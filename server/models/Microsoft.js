import mongoose from 'mongoose';
import User from "../models/User.js";

const microsoftSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    microsoftId: {
        type: String,
        unique: true,
        required: true
    },
    displayName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        lowercase: true
    },
    accessToken: {
        type: String,
        required: true
    },
    refreshToken: {
        type: String
    },
    avatar: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Microsoft = mongoose.model('Microsoft', microsoftSchema);

export default Microsoft;

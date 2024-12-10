import mongoose from 'mongoose';
import User from "../models/User.js";

const miroSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    miroId: {
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
    avatarUrl: {
        type: String
    },
    accessToken: {
        type: String,
        required: true
    },
    refreshToken: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Miro = mongoose.model('Miro', miroSchema);

export default Miro;
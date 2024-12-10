import mongoose from 'mongoose';
import User from './User.js';

const githubSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    githubId: {
        type: String,
        unique: true,
        required: true
    },
    username: {
        type: String,
        required: true
    },
    accessToken: {
        type: String,
        required: true
    },
    refreshToken: {
        type: String
    },
    profileUrl: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Github = mongoose.model('Github', githubSchema);

export default Github;
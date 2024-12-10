import mongoose from 'mongoose';

const twitchSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    twitchId: {
        type: String,
        unique: true,
        required: true
    },
    displayName: {
        type: String
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

const Twitch = mongoose.model('Twitch', twitchSchema);

export default Twitch;

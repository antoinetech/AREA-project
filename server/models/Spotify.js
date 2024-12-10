import mongoose from 'mongoose';

const spotifySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    spotifyId: {
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

const Spotify = mongoose.model('Spotify', spotifySchema);

export default Spotify;
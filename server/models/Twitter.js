import mongoose from "mongoose";

const TwitterSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    twitterId: {
        type: String,
        required: true,
        unique: true,
    },
    username: {
        type: String,
        required: true,
    },
    avatar: {
        type: String,
        default: "",
    },
    accessToken: {
        type: String,
        required: true,
    },
    refreshToken: {
        type: String,
        default: "",
    },
    tokenExpiration: {
        type: Date,
        default: null,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
});

TwitterSchema.pre("save", function (next) {
    this.updatedAt = Date.now();
    next();
});

export default mongoose.model("Twitter", TwitterSchema);


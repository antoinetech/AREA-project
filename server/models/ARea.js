import mongoose from "mongoose";

const areaSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    action: {
        serviceId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Services',
            required: true
        },
        actionId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true
        },
        subscriptionId: {
            type: String
        },
        params: {
            type: Map,
            of: String
        },
        repository:
        {
            type: String
        }
    },
    reactions: [
        {
            serviceId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Services',
                required: true
            },
            reactionId: {
                type: mongoose.Schema.Types.ObjectId,
                required: true
            },
            params: {
                type: Map,
                of: String
            }
        }
    ],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Area = mongoose.model('Area', areaSchema);

export default Area;

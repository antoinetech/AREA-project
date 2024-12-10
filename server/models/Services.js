import mongoose from "mongoose";

const actionSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String
    },
    params: [String]
});

const reactionSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String
    },
    params: [String]
});

const servicesSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    actions: [actionSchema],
    reactions: [reactionSchema]
});

const Services = mongoose.model('Services', servicesSchema);

export default Services;

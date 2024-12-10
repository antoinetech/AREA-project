import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    serviceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Services'
    }
});


const Subscription = mongoose.model('Subscription', subscriptionSchema);

export default Subscription;
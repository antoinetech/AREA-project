import express from "express";
import jwt from 'jsonwebtoken';
import { authenticateToken } from "../middlewares/Authentification.js";
import Services from "../models/Services.js";
import Subscription from "../models/Subscriptions.js";

const router = express.Router();

router.get("/user-logged", authenticateToken, (req, res) => {
    res.status(200).json( { "success": true, "name": req.user.name,
        "surname": req.user.surname, "email":  req.user.email} )
});

router.get("/user-subscriptions", authenticateToken, async (req, res) => {
    try {
        const subscriptions = await Subscription.find({ userId: req.user.id }).populate('serviceId', '_id name');
        res.status(200).json(subscriptions);
    } catch (error) {
        res.status(500).json({ "error": error });
    }

});

export default router;
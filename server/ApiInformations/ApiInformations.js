import express from "express";
import Services from "../models/Services.js";
const router = express.Router();

router.get("/about.json", async (req, res) => {
    const serverTime = Math.floor(Date.now() / 1000);
    let clientIp = req.ip;
    if (clientIp.includes('::ffff:')) {
        clientIp = clientIp.split(':').pop();
    }
    try {
        const services_details = await Services.find()
            .select("-_id -__v -actions._id -actions.__v -reactions._id -reactions.__v");
        const response = {
            client: {
                host: clientIp
            },
            server: {
                current_time: serverTime,
                services: services_details
            }
        };
        res.status(200).json(response);
    } catch (error) {
        res.status(500).json({ error: "Erreur lors de la récupération des ServicesAuthentification" });
    }
});

export default router;

import express from "express";
import Subscription from "../models/Subscriptions.js";
import Services from "../models/Services.js";
import Github from "../models/Github.js";
import Microsoft from "../models/Microsoft.js";
import Discord from "../models/Discord.js";
import Spotify from "../models/Spotify.js";
import Twitch from "../models/Twitch.js";
import Twitter from "../models/Twitter.js";
import { authenticateToken } from "../middlewares/Authentification.js";
import Area from "../models/ARea.js";
import { unsubscribeOutlookWebhook } from "../Webhook/outlook.js";
import Miro from "../models/Miro.js";
import { unsubscribeGithubWebhook } from "../Webhook/github.js";
import { unsubscribeDiscord } from "../Webhook/discord.js";
import { deleteAreaByName } from "../ActionReactionSetup/ActionReactionRouteManagement.js";

const router = express.Router();

export async function getServiceIdByName(serviceName) {
    try {
        console.log(`Recherche du service avec le nom: ${serviceName}`);
        const service = await Services.findOne({ name: serviceName });
        if (service) {
            console.log(`Service trouvé: ${service._id}`);
        } else {
            console.warn(`Aucun service trouvé avec le nom: ${serviceName}`);
        }
        return service ? service._id : null;
    } catch (error) {
        console.error('Erreur lors de la récupération du service:', error);
        throw new Error(`Erreur lors de la récupération du service: ${error.message}`);
    }
}

router.post("/create-subscription/:serviceName", authenticateToken, async (req, res) => {
    const serviceName = req.params.serviceName;
    console.log(`Tentative de création d'une souscription pour le service: ${serviceName}`);

    try {
        const serviceId = await getServiceIdByName(serviceName);
        if (!serviceId) return res.status(404).json({ success: false, message: 'Service non trouvé' });

        const accountExists = await ({
            'Github': () => Github.findOne({ userId: req.user.id }),
            'Outlook': () => Microsoft.findOne({ userId: req.user.id }),
            'Microsoft-Calendar': () => Microsoft.findOne({ userId: req.user.id }),
            'Spotify': () => Spotify.findOne({ userId: req.user.id }),
            'Discord': () => Discord.findOne({ userId: req.user.id }),
            'Twitch': () => Twitch.findOne({ userId: req.user.id }),
            'Twitter': () => Twitter.findOne({ userId: req.user.id }),
            'Miro': () => Miro.findOne({ userId: req.user.id })
        }[serviceName] || (() => null))();

        if (!accountExists) return res.status(403).json({ success: false, message: `Aucun compte lié trouvé pour ${serviceName}. Veuillez d'abord vous connecter à ce service.` });

        const newSubscription = new Subscription({ userId: req.user.id, serviceId });
        await newSubscription.save();
        console.log(`Souscription créée pour l'utilisateur: ${req.user.id}`);

        res.status(200).json({ success: true, message: 'Subscription créée avec succès' });
    } catch (error) {
        console.error('Erreur lors de la création de la souscription:', error);
        res.status(500).json({ success: false, message: 'Erreur interne du serveur', error: error.message });
    }
});

router.delete("/delete-subscription/:serviceName", authenticateToken, async (req, res) => {
    const serviceName = req.params.serviceName;
    console.log(`Début de la suppression pour le service : ${serviceName}`);

    const serviceId = await getServiceIdByName(serviceName);
    const userId = req.user._id ? req.user._id.toString() : req.user.id;

    if (!serviceId) return res.status(404).json({ success: false, message: 'Service non trouvé' });

    try {
        const areasToDelete = await Area.find({
            userId,
            $or: [{ 'action.serviceId': serviceId }, { 'reactions.serviceId': serviceId }]
        });

        for (const area of areasToDelete) {
            const deleteResult = await deleteAreaByName(area.name, userId);
            if (!deleteResult.success) return res.status(500).json({ success: false, message: deleteResult.message });
        }

        await Subscription.deleteOne({ userId, serviceId });
        console.log(`Souscription supprimée pour serviceId: ${serviceId}`);

        res.status(200).json({ success: true, message: 'Souscription et Areas associées supprimées avec succès' });
    } catch (error) {
        console.error('Erreur lors de la suppression de la souscription ou des Areas associées :', error);
        res.status(500).json({ success: false, message: "Erreur interne du serveur" });
    }
});

export default router;


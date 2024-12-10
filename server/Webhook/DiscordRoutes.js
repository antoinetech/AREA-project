import Area from "../models/ARea.js";
import {LinkActionToReaction} from "../ActionReactionSetup/ProduceReaction.js";
import express from "express";


const router = express.Router();

router.post('/messages', async (req, res) => {
    const { serverName, channelName, author, content } = req.body;

    try {
        const find_attach_action = await Area.find({
            'action.params.serverName': serverName,
            'action.params.channelName': channelName
        }).populate({
            path: 'action.actionId',
            match: { name: 'Détection de nouveaux messages' },
            select: 'name'
        });

        await Promise.all(
            find_attach_action.map(async (area) => {
                const { actionId, userId } = area.action;
                const subscriptionID = area.action.subscriptionId;

                if (actionId && subscriptionID) {
                    await LinkActionToReaction(subscriptionID, content, author);
                } else {
                    console.log("Action ou subscriptionID manquant, saut de cette zone.");
                }
            })
        );

        res.status(200).send('Webhook Discord traité avec succès');
    } catch (error) {
        res.status(500).send('Erreur dans le traitement du webhook Discord');
    }
});



export default router;
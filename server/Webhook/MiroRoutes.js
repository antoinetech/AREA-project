import {LinkActionToReaction} from "../ActionReactionSetup/ProduceReaction.js";
import express from "express";
import Area from "../models/ARea.js";

const router = express.Router();

router.post('/controller', async (req, res) => {
    try {

        console.log('Received webhook request:', JSON.stringify(req.body, null, 2));

        if (req.body.challenge) {
            console.log('Webhook validation challenge received:', req.body.challenge);
            res.json({ challenge: req.body.challenge });
            return;
        }

        if (req.body.event) {
            const eventType = req.body.event.type;
            console.log(`Event type: ${eventType}`);

            if (eventType === 'create') {
                const itemType = req.body.event.item.type;
                const itemContent = req.body.event.item.data.content;
                const boardId = req.body.event.boardId;

                console.log(`New item created of type: ${itemType}`);
                console.log(`Item content: ${itemContent}`);
                console.log(`Board ID: ${boardId}`);

                const find_attach_action = await Area.find({
                    'action.params.boardId': boardId
                }).populate({
                    path: 'action.actionId',
                    match: { name: "Détecter l'ajout d'un item dans un board" },
                    select: 'name'
                });

                console.log('Found attached actions:', JSON.stringify(find_attach_action, null, 2));

                await Promise.all(
                    find_attach_action.map(async (area) => {
                        const { actionId, userId } = area.action;
                        const subscriptionID = area.action.subscriptionId;

                        console.log(`Processing actionId: ${actionId}, subscriptionID: ${subscriptionID}`);

                        if (actionId && subscriptionID) {
                            await LinkActionToReaction(subscriptionID);
                        }
                    })
                );

                res.send("OK");
            }
        } else {
            console.log("No event in the request body");
            res.status(400).send("No event in the request body");
        }
    } catch (error) {
        console.error('Error in Miro webhook controller:', error);
        res.status(500).send('Internal server error');
    }
});


export default router;
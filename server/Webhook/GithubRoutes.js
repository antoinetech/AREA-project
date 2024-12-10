import {LinkActionToReaction} from "../ActionReactionSetup/ProduceReaction.js";
import Area from "../models/ARea.js";
import express from "express";
import path from "path";

const router = express.Router();

router.post('/controller', async (req, res) => {
    const {ref, commits, repository, hook} = req.body;
    const githubEvent = req.headers['x-github-event'];
    try {
        if (githubEvent === 'push') {
            if (ref === 'refs/heads/main') {
                const repository_name = repository.full_name;
                const find_attach_action = await
                    Area.find({
                        'action.params.AttachUserRepo': repository_name
                    }).populate({
                        path: 'action.actionId',
                        match: {name: 'Détection de nouveaux commits'},
                        select: 'name'
                    });
                await Promise.all(
                    find_attach_action.map(async (area) => {
                        const {actionId, userId} = area.action;
                        const subscriptionID = area.action.subscriptionId;
                        if (actionId && subscriptionID) {
                            await LinkActionToReaction(subscriptionID);
                        }
                    }));
            }
        }
    } catch (error) {
        console.error("Erreur dans le contrôleur Github:", error.message);
    }
});

export default router;

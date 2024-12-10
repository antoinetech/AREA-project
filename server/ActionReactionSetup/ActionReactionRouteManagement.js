import express from "express";
import Subscription from "../models/Subscriptions.js";
import Services from "../models/Services.js";
import Github from "../models/Github.js";
import Miro from "../models/Miro.js";
import { authenticateToken } from "../middlewares/Authentification.js";
import Area from "../models/ARea.js";
import {suscribeOutlook, unsubscribeOutlookWebhook} from "../Webhook/outlook.js";
import Microsoft from "../models/Microsoft.js";
import Discord from "../models/Discord.js";
import {suscribeGithub, unsubscribeGithubWebhook} from "../Webhook/github.js";

import { subscribeDiscord, unsubscribeDiscord } from "../Webhook/discord.js"
import ARea from "../models/ARea.js";
import {suscribeMiro, unsuscribeMiro } from "../Webhook/miro.js";


export async function deleteAreaByName(areaName, userId) {
    try {

        const area_package = await Area.findOne({ name: areaName, userId: userId });
        if (!area_package) {
            throw new Error(`Aucune Area trouvée avec le nom "${areaName}"`);
        }

        const actionService = await Services.findById(area_package.action.serviceId);
        if (!actionService) {
            throw new Error('Service d\'action non trouvé');
        }

        if (actionService.name === 'Outlook' || actionService.name === 'Microsoft-Calendar') {
            const microsoftUser = await Microsoft.findOne({ userId: userId });
            if (!microsoftUser || !microsoftUser.accessToken) {
                throw new Error('Compte Microsoft non trouvé ou accessToken manquant');
            }
            const accessToken = microsoftUser.accessToken;
            if (area_package.action.subscriptionId) {
                await unsubscribeOutlookWebhook(area_package.action.subscriptionId, accessToken);
            }
        }

        if (actionService.name === 'Github') {
            const githubUser = await Github.findOne({ userId: userId });
            if (!githubUser || !githubUser.accessToken) {
                throw new Error('Compte Github non trouvé ou accessToken manquant');
            }
            const actionParams = area_package.action.params;
            const username = actionParams.get('username');
            const repoName = actionParams.get('name_repo');
            const accessToken = githubUser.accessToken;
            await unsubscribeGithubWebhook(area_package.action.subscriptionId, accessToken, username, repoName);
        }

        if (actionService.name === 'Discord') {
            const discordUser = await Discord.findOne({ userId: userId });
            if (!discordUser || !discordUser.accessToken) {
                throw new Error('Compte Discord non trouvé ou accessToken manquant');
            }
            const actionParams = area_package.action.params;
            const guildId = actionParams.get('guildId');
            const channelId = actionParams.get('channelId');
            if (!guildId || !channelId) {
                throw new Error('Guild ID ou Channel ID manquant pour Discord');
            }
            await unsubscribeDiscord(`${process.env.DISCORD_BOT_TOKEN}`, guildId, channelId);
        }

        if (actionService.name === 'Miro') {
            const miroUser = await Miro.findOne({ userId: userId });
            if (!miroUser || !miroUser.accessToken) {
                throw new Error('Compte Miro non trouvé ou accessToken manquant');
            }
            const accessToken = miroUser.accessToken;
            if (area_package.action.subscriptionId) {
                await unsuscribeMiro(area_package.action.subscriptionId, accessToken);
            }
        }

        await Area.deleteOne({ _id: area_package._id });
        console.log(`Area "${areaName}" supprimée avec succès`);
        return { success: true, message: `L'Area "${areaName}" a été supprimée avec succès` };
    } catch (error) {
        console.error(`Erreur lors de la suppression de l'Area "${areaName}":`, error);
        return { success: false, message: error.message };
    }
}

const router = express.Router();

router.delete("/deleteArea/:areaName", authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const areaName = req.params.areaName;
        const area_package = await Area.findOne({ name: areaName, userId: userId });
        if (!area_package) {
            return res.status(404).json({ success: false, message: `Aucune Area trouvée avec le nom "${areaName}"` });
        }
        const actionService = await Services.findById(area_package.action.serviceId);
        if (!actionService) {
            return res.status(404).json({ success: false, message: 'Service d\'action non trouvé' });
        }
        if (actionService.name === 'Outlook' || actionService.name === 'Microsoft-Calendar') {
            const microsoftUser = await Microsoft.findOne({ userId: userId });
            if (!microsoftUser || !microsoftUser.accessToken) {
                return res.status(404).json({ success: false, message: 'Compte Microsoft non trouvé ou accessToken manquant' });
            }
            const accessToken = microsoftUser.accessToken;
            if (area_package.action.subscriptionId) {
                await unsubscribeOutlookWebhook(area_package.action.subscriptionId, accessToken);
            }
        }
        if (actionService.name === 'Github') {
            const githubUser = await Github.findOne({ userId: userId });
            if (!githubUser || !githubUser.accessToken) {
                return res.status(404).json({ success: false, message: 'Compte Github non trouvé ou accessToken manquant' });
            }
            const actionParams = area_package.action.params;
            const username = actionParams.get('username');
            const repoName = actionParams.get('name_repo');
            const accessToken = githubUser.accessToken;
            await unsubscribeGithubWebhook(area_package.action.subscriptionId, accessToken,
                username, repoName);
        }
        if (actionService.name === 'Discord') {
            const discordUser = await Discord.findOne({ userId: userId });
            if (!discordUser || !discordUser.accessToken) {
                return res.status(404).json({ success: false, message: 'Compte Github non trouvé ou accessToken manquant' });
            }
            const actionParams = area_package.action.params;
            const guildId = actionParams.get('guildId');
            const channelId = actionParams.get('channelId');
            if (!guildId || !channelId) {
                return res.status(404).json({ success: false, message: 'Guild ID ou Channel ID manquant pour Discord' });
            }
            await unsubscribeDiscord(`${process.env.DISCORD_BOT_TOKEN}`, guildId, channelId);
        }
        if (actionService.name === 'Miro') {
            const miroUser = await Miro.findOne({userId: userId});
            if (!miroUser || !miroUser.accessToken) {
                return res.status(404).json({
                    success: false,
                    message: 'Compte Miro non trouvé ou accessToken manquant'
                });
            }
            const accessToken = miroUser.accessToken;
            if (area_package.action.subscriptionId) {
                await unsuscribeMiro(area_package.action.subscriptionId, accessToken);
            }
        }
        await Area.deleteOne({ _id: area_package._id });

        res.status(200).json({ success: true, message: `L'Area "${areaName}" a été supprimée avec succès` });
    } catch (error) {
        console.error('Erreur lors de la suppression de l\'Area:', error);
        res.status(500).json({ success: false, message: "Erreur interne du serveur" });
    }
});

router.post("/createArea", authenticateToken, async (req, res) => {
    const { name, ActionService, Action, Reactions } = req.body;
    const userId = req.user.id;
    if (!userId) {
        console.error("Utilisateur non authentifié.");
        return res.status(400).json({ success: false, message: 'Utilisateur non authentifié.' });
    }

    try {
        const area_package = await Area.findOne({ name: name, userId: userId });
        if (area_package) {
            console.error(`Une Area avec le nom "${name}" existe déjà pour cet utilisateur.`);
            return res.status(400).json({ success: false, message: `Une Area avec le nom "${name}" existe déjà` });
        }
        const actionService = await Services.findOne({ name: ActionService });
        if (!actionService) {
            console.error('Service non trouvé pour le nom :', ActionService);
            return res.status(404).json({ success: false, message: 'Service non trouvé' });
        }
        const action = actionService.actions.find(act => act.name === Action.name);
        if (!action) {
            console.error('Action non trouvée pour le nom :', Action.name);
            return res.status(404).json({ success: false, message: 'Action non trouvée' });
        }

        const actionParams = Action.params || {};

        const reactionDetails = await Promise.all(Reactions.map(async (reaction, index) => {
            const { ReactionService, Reaction, params } = reaction;
            const reactionService = await Services.findOne({ name: ReactionService });
            if (!reactionService) {
                throw new Error(`Service de réaction non trouvé : ${ReactionService}`);
            }
            const foundReaction = reactionService.reactions.find(react => react.name === Reaction);
            if (!foundReaction) {
                throw new Error(`Réaction non trouvée : ${Reaction}`);
            }
            return {
                serviceId: reactionService._id,
                reactionId: foundReaction._id,
                params: params || {}
            };
        }));

        let subscriptionID = null;

        if (actionService.name === "Outlook") {
            subscriptionID = await suscribeOutlook(actionService._id, action._id, userId);
            if (!subscriptionID) {
                throw new Error(`Subscription ID manquant pour Outlook`);
            }
        }
        else if (actionService.name === "Github") {
            subscriptionID = await suscribeGithub(actionService._id, action._id, userId, actionParams);
            if (!subscriptionID) {
                throw new Error(`Subscription ID manquant pour GitHub`);
            }
            actionParams['AttachUserRepo'] = `${actionParams['username']}/${actionParams['name_repo']}`;
        }
        else if (actionService.name === "Discord") {
            const { subscriptionId, guildId, channelId } = await subscribeDiscord(actionParams, userId, actionService._id, action._id);
            if (!subscriptionId) {
                throw new Error(`Subscription ID manquant pour Discord`);
            }
            actionParams['guildId'] = guildId;
            actionParams['channelId'] = channelId;
            subscriptionID = subscriptionId;
        }
        else if (actionService.name === "Miro") {
            const { subscriptionId, boardId } = await suscribeMiro(actionService._id, action._id, userId, actionParams);
            if (!subscriptionId) {
                throw new Error(`Subscription ID manquant pour Miro`);
            }
            actionParams['boardId'] = boardId;
            subscriptionID = subscriptionId;
            console.log(`[DEBUG] Souscription Miro réussie avec ID : ${subscriptionID}`);
        }
        else if (actionService.name === "Microsoft-Calendar") {
            subscriptionID = await suscribeOutlook(actionService._id, action._id, userId);
            if (!subscriptionID) {
                throw new Error(`Subscription ID manquant pour Teams`);
            }
        }
        else {
            throw new Error(`Service non existent ${ ActionService.name }`);
        }

        const newArea = new Area({
            name,
            userId,
            action: {
                serviceId: actionService._id,
                actionId: action._id,
                subscriptionId: subscriptionID || null,
                params: actionParams
            },
            reactions: reactionDetails
        });
        await newArea.save();

        res.status(200).json({ success: true, message: 'Area créée avec succès' });
    } catch (error) {
        console.error("Erreur lors de la création de l'Area :", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get("/get-areas", authenticateToken, async (req, res) => {
    try {
        const areas = await Area.find({ userId: req.user.id })
            .populate({
                path: 'action.serviceId',
                select: 'name',
            })
            .populate({
                path: 'reactions.serviceId',
                select: 'name',
            });

        const organizedData = await Promise.all(areas.map(async (area) => {

            const actionParams = area.action.params instanceof Map
                ? Object.fromEntries(area.action.params)
                : area.action.params;

            const actionService = await Services.findById(area.action.serviceId._id);
            const action = actionService.actions.id(area.action.actionId);

            const reactions = await Promise.all(area.reactions.map(async (reaction) => {
                const reactionParams = reaction.params instanceof Map
                    ? Object.fromEntries(reaction.params)
                    : reaction.params;

                const reactionService = await Services.findById(reaction.serviceId._id);
                const reactionAction = reactionService.reactions.id(reaction.reactionId);

                return {
                    service: reaction.serviceId.name,
                    name: reactionAction.name,
                    params: reactionParams
                };
            }));

            return {
                areaName: area.name,
                action: {
                    service: area.action.serviceId.name,
                    name: action.name,
                    params: actionParams
                },
                reactions: reactions.map((reaction) => ({ ...reaction }))
            };
        }));

        console.log(JSON.stringify(organizedData, null, 2));
        res.status(200).json(organizedData);
    } catch (error) {
        res.status(500).json({ "error": error.message });
    }
});

router.put("/updateArea/:areaName", authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const areaName = req.params.areaName;
        const { newName, ActionService, Action, Reactions } = req.body;

        console.log("[DEBUG] Requête reçue :");
        console.log(`[DEBUG] Headers : ${JSON.stringify(req.headers, null, 2)}`);
        console.log(`[DEBUG] Params : ${JSON.stringify(req.params, null, 2)}`);
        console.log(`[DEBUG] Body : ${JSON.stringify(req.body, null, 2)}`);

        const area_package = await Area.findOne({ name: areaName, userId: userId });
        console.log(`[DEBUG] Area trouvée : ${JSON.stringify(area_package, null, 2)}`);
        if (!area_package) {
            return res.status(404).json({ success: false, message: `Aucune Area trouvée avec le nom "${areaName}"` });
        }

        if (newName) {
            console.log(`[DEBUG] Changement du nom de l'Area de "${area_package.name}" à "${newName}"`);
            area_package.name = newName;
        }

        const actionService = await Services.findOne({ name: ActionService });
        console.log(`[DEBUG] Service d'action trouvé : ${JSON.stringify(actionService, null, 2)}`);
        if (!actionService) {
            return res.status(404).json({ success: false, message: 'Service d\'action non trouvé' });
        }

        const action = actionService.actions.find(act => act.name === Action.name);
        console.log(`[DEBUG] Action trouvée : ${JSON.stringify(action, null, 2)}`);
        if (!action) {
            return res.status(404).json({ success: false, message: 'Action non trouvée' });
        }

        const actionParams = Action.params || {};
        console.log(`[DEBUG] ActionParams : ${JSON.stringify(actionParams, null, 2)}`);
        let subscriptionID = area_package.action.subscriptionId;
        console.log(`[DEBUG] SubscriptionID actuel : ${subscriptionID}`);

        const actionHasChanged = (
            area_package.action.serviceId.toString() !== actionService._id.toString() ||
            JSON.stringify(area_package.action.params) !== JSON.stringify(actionParams)
        );
        console.log(`[DEBUG] L'action a-t-elle changé ? ${actionHasChanged}`);

        if (actionHasChanged) {
            console.log("[DEBUG] L'action a changé. Désinscription de l'ancienne action et souscription à la nouvelle.");

            const oldActionService = await Services.findById(area_package.action.serviceId);
            console.log(`[DEBUG] Ancien service d'action trouvé : ${oldActionService.name}`);

            if (oldActionService.name === 'Outlook' && subscriptionID) {
                const microsoftUser = await Microsoft.findOne({ userId: userId });
                if (microsoftUser && microsoftUser.accessToken) {
                    await unsubscribeOutlookWebhook(subscriptionID, microsoftUser.accessToken);
                    console.log(`[DEBUG] Désinscription du webhook Outlook pour subscriptionID ${subscriptionID}`);
                }
            } else if (oldActionService.name === 'Github' && subscriptionID) {
                const githubUser = await Github.findOne({ userId: userId });
                if (githubUser && githubUser.accessToken) {
                    const { username, name_repo } = area_package.action.params;
                    await unsubscribeGithubWebhook(subscriptionID, githubUser.accessToken, username, name_repo);
                    console.log(`[DEBUG] Désinscription du webhook Github pour subscriptionID ${subscriptionID}`);
                }
            } else if (oldActionService.name === 'Discord' && subscriptionID) {
                const discordUser = await Discord.findOne({ userId: userId });
                if (discordUser && discordUser.accessToken) {
                    const { guildId, channelId } = area_package.action.params;
                    await unsubscribeDiscord(`${process.env.DISCORD_BOT_TOKEN}`, guildId, channelId);
                    console.log(`[DEBUG] Désinscription du webhook Discord pour subscriptionID ${subscriptionID}`);
                }
            }

            if (actionService.name === "Outlook") {
                subscriptionID = await suscribeOutlook(actionService._id, action._id, userId);
                console.log(`[DEBUG] Souscription Outlook réussie avec ID : ${subscriptionID}`);
            } else if (actionService.name === "Github") {
                subscriptionID = await suscribeGithub(actionService._id, action._id, userId, actionParams);
                actionParams['AttachUserRepo'] = `${actionParams['username']}/${actionParams['name_repo']}`;
                console.log(`[DEBUG] Souscription Github réussie avec ID : ${subscriptionID}`);
            } else if (actionService.name === "Discord") {
                const { subscriptionId, guildId, channelId } = await subscribeDiscord(actionParams, userId, actionService._id, action._id);
                actionParams['guildId'] = guildId;
                actionParams['channelId'] = channelId;
                subscriptionID = subscriptionId;
                console.log(`[DEBUG] Souscription Discord réussie avec ID : ${subscriptionID}`);
            }
            else if (actionService.name === "Miro") {
                subscriptionID = await suscribeMiro(actionService._id, action._id, userId);
            }

            area_package.action = {
                serviceId: actionService._id,
                actionId: action._id,
                subscriptionId: subscriptionID || null,
                params: actionParams
            };
            console.log(`[DEBUG] Action mise à jour : ${JSON.stringify(area_package.action, null, 2)}`);
        }

        if (Reactions) {
            console.log("[DEBUG] Mise à jour des réactions.");
            const reactionDetails = await Promise.all(Reactions.map(async (reaction, index) => {
                const { ReactionService, Reaction, params } = reaction;
                const reactionService = await Services.findOne({ name: ReactionService });
                console.log(`[DEBUG] Service de réaction trouvé : ${JSON.stringify(reactionService, null, 2)}`);
                if (!reactionService) {
                    throw new Error(`Service de réaction non trouvé : ${ReactionService}`);
                }
                const foundReaction = reactionService.reactions.find(react => react.name === Reaction);
                console.log(`[DEBUG] Réaction trouvée : ${JSON.stringify(foundReaction, null, 2)}`);
                if (!foundReaction) {
                    throw new Error(`Réaction non trouvée : ${Reaction}`);
                }

                const currentReaction = area_package.reactions[index];
                const reactionHasChanged = (
                    !currentReaction ||
                    currentReaction.serviceId.toString() !== reactionService._id.toString() ||
                    currentReaction.reactionId.toString() !== foundReaction._id.toString() ||
                    JSON.stringify(currentReaction.params) !== JSON.stringify(params || {})
                );

                if (reactionHasChanged) {
                    console.log(`[DEBUG] Réaction changée pour "${Reaction}". Mise à jour en cours...`);
                } else {
                    console.log(`[DEBUG] Aucune modification détectée pour la réaction "${Reaction}".`);
                }

                return {
                    serviceId: reactionService._id,
                    reactionId: foundReaction._id,
                    params: params || {}
                };
            }));

            area_package.reactions = reactionDetails;
            console.log(`[DEBUG] Réactions mises à jour : ${JSON.stringify(area_package.reactions, null, 2)}`);
        }


        await area_package.save();
        console.log(`[DEBUG] Area "${newName || areaName}" modifiée avec succès.`);
        res.status(200).json({ success: true, message: `L'Area "${newName || areaName}" a été modifiée avec succès` });
    } catch (error) {
        console.error('[ERROR] Erreur lors de la modification de l\'Area :', error.message);
        res.status(500).json({ success: false, message: "Erreur interne du serveur" });
    }
});




export default router;

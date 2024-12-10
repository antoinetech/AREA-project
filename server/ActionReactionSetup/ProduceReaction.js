import express from "express";
import axios from "axios";
import User from "../models/User.js";
import Services from "../models/Services.js";
import subscriptions from "../models/Subscriptions.js";
import { ProduceGithubReaction } from "./Github.js";
import { ProduceOutlookReaction } from "./Outlook.js";
import { ProduceSpotifyReaction } from "./Spotify.js";
import { ProduceDiscordReaction } from "./Discord.js"
import Area from "../models/ARea.js";
import {ProduceMiroReaction} from "./Miro.js";
import {ProduceTwitterReaction} from "./Twitter.js";
import {ProduceTwitchReaction} from "./Twitch.js";

export const LinkActionToReaction = async (subscriptionID) => {
    try {
        const area_package = await Area.findOne({ 'action.subscriptionId': subscriptionID });
        if (!area_package) {
            console.error("Erreur : Aucune Area trouvée pour subscriptionID:", subscriptionID);
            throw new Error('Area non trouvée pour cette souscription');
        }
        const userID = area_package.userId;
        for (const [index, reaction] of area_package.reactions.entries()) {
            const service = await Services.findById(reaction.serviceId);
            if (!service) {
                console.error("Erreur : Service non trouvé pour reaction.serviceId:", reaction.serviceId);
                throw new Error('Service non trouvé pour cette réaction');
            }
            const serviceName = service.name;
            let reactionParams = reaction.params;
            if (reaction.params instanceof Map) {
                reactionParams = Object.fromEntries(reaction.params.entries());
            }
            if (serviceName === 'Github') {
                await ProduceGithubReaction(reaction, userID, reactionParams);
            }
            else if (serviceName === 'Outlook' || serviceName === 'Microsoft-Calendar') {
                await ProduceOutlookReaction(reaction, userID, reactionParams);
            }
            else if (serviceName === 'Spotify') {
                await ProduceSpotifyReaction(reaction, userID, reactionParams)
            }
            else if (serviceName === 'Discord') {
                await ProduceDiscordReaction(reaction, userID, reactionParams)
            }
            else if (serviceName === 'Miro') {
                await ProduceMiroReaction(reaction, userID, reactionParams)
            }
            else if (serviceName === 'Twitter') {
                await ProduceTwitterReaction(reaction, userID, reactionParams)
            }
            else if (serviceName === 'Twitch') {
                await ProduceTwitchReaction(reaction, userID, reactionParams)
            }
            else {
                console.error("Erreur : Service non reconnu pour la réaction:", serviceName);
                throw new Error('Service non reconnu pour cette réaction');
            }
        }
    } catch (error) {
        console.error("Erreur dans LinkActionToReaction:", error.message);
        throw new Error('Link action to reaction failed');
    }
};



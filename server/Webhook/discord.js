import express from "express";
import axios from "axios";
import User from "../models/User.js";
import Services from "../models/Services.js";
import Discord from "../models/Discord.js";
import Subscriptions from "../models/Subscriptions.js";
import { v4 as uuidv4 } from 'uuid';
import { Client, GatewayIntentBits } from "discord.js";
import Subscription from "../models/Subscriptions.js";
import {deleteAreaByName} from "../ActionReactionSetup/ActionReactionRouteManagement.js";
import Area from "../models/ARea.js";
import {getServiceIdByName} from "../subscriptionRoutes/SubscriptionManagement.js";

export const unsubscribeDiscord = async (botToken, guildId, channelId) => {
    /*try {
        const client = new Client({
            intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
        });

        await client.login(botToken);

        client.once('ready', async () => {
            const guild = client.guilds.cache.get(guildId);
            if (!guild) {
                throw new Error(`Serveur avec l'ID ${guildId} non trouvé.`);
            }

            const channel = guild.channels.cache.get(channelId);
            if (!channel) {
                throw new Error(`Canal avec l'ID ${channelId} non trouvé.`);
            }

            await guild.leave();
        });

    } catch (error) {
        console.error('Erreur lors de la désinscription du bot Discord:', error.message);
        throw new Error('Erreur lors de la désinscription du bot Discord.');
    }*/
};

export async function renewDiscordAccessToken(refreshToken, userId) {
    const tokenUrl = 'https://discord.com/api/oauth2/token';

    const params = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: process.env.DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_SECRET
    });

    try {
        const response = await axios.post(tokenUrl, params, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        const { access_token, refresh_token: new_refresh_token, expires_in } = response.data;

        const update = {
            $set: {
                accessToken: access_token,
                refreshToken: new_refresh_token || refreshToken,
                expiresIn: expires_in
            }
        };

        const refreshAccount = await Discord.findOneAndUpdate(
            { userId: userId },
            update,
            { new: true, upsert: false }
        );

        if (!refreshAccount) {
            console.error('Aucun compte Discord trouvé pour cet utilisateur');
        } else {
            console.log('Compte Discord mis à jour avec succès', refreshAccount);
        }

    } catch (error) {
        if (error.response?.data?.error === 'invalid_grant') {
            console.error('Le refresh token Discord est invalide. Suppression du compte, des souscriptions et des Areas liées à Discord...');

            try {
                const discordService = await getServiceIdByName('Discord');
                if (!discordService) {
                    console.error('Service Discord non trouvé dans la base de données');
                    return;
                }

                const areasToDelete = await Area.find({
                    userId,
                    $or: [
                        { "action.serviceId": discordService._id },
                        { "reactions.serviceId": discordService._id }
                    ],
                });

                if (areasToDelete.length > 0) {
                    console.log(`Areas associées à Discord trouvées, nombre : ${areasToDelete.length}`);

                    for (const area of areasToDelete) {
                        console.log(`Suppression de l'Area : ${area.name}`);
                        const deleteResult = await deleteAreaByName(area.name, userId);
                        if (!deleteResult.success) {
                            console.error(`Erreur lors de la suppression de l'Area : ${area.name}`);
                        }
                    }
                }

                await Subscription.deleteMany({ userId, serviceId: discordService._id });
                console.log(`Souscriptions Discord supprimées pour l'utilisateur : ${userId}`);

                await Discord.findOneAndDelete({ userId: userId });
                console.log(`Compte Discord supprimé pour l'utilisateur : ${userId}`);

            } catch (deleteError) {
                console.error("Erreur lors de la suppression des données associées à Discord:", deleteError.message);
            }
        } else {
            console.error('Erreur lors du renouvellement du token Discord:', error.response?.data || error.message);
            throw error;
        }
    }
}


export const subscribeDiscord = async (actionParams, userId, serviceId, ActionId) => {
    try {
        const subscriptionId = uuidv4();

        const service = await Services.findById(serviceId);
        if (!service || !service.actions) {
            throw new Error('Service ou actions non trouvés');
        }

        const action = service.actions.find(act => act._id.equals(ActionId));
        if (!action) {
            throw new Error('Action non trouvée');
        }

        const user = await Discord.findOne({ userId });
        if (!user || !user.accessToken) {
            throw new Error('Compte Discord non trouvé ou accessToken manquant');
        }

        const serverName = actionParams['serverName'];
        if (!serverName) {
            throw new Error('Paramètre "serverName" manquant');
        }
        const channelName = actionParams['channelName'];
        if (!channelName) {
            throw new Error('Paramètre "channelName" manquant');
        }

        const client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent
            ]
        });

        await client.login(process.env.DISCORD_BOT_TOKEN).catch(err => {
            throw new Error('Erreur lors de la connexion au bot Discord : ' + err.message);
        });

        return new Promise((resolve, reject) => {
            client.once('ready', async () => {
                try {
                    const guild = client.guilds.cache.find(g => g.name === serverName);
                    if (!guild) {
                        reject(new Error(`Serveur "${serverName}" non trouvé`));
                    }

                    const channel = guild.channels.cache.find(ch => ch.name === channelName && ch.isTextBased());
                    if (!channel) {
                        reject(new Error(`Canal "${channelName}" non trouvé dans le serveur "${serverName}"`));
                    }

                    if (action.name === 'Recevoir un message') {
                        client.on('messageCreate', async (message) => {
                            if (message.channel.id === channel.id && !message.author.bot) {

                                if (message.author.id === userId) {
                                    console.log("Message ignoré, car c'est l'utilisateur spécifié.");
                                    return;
                                }

                                try {
                                    await axios.post(`${process.env.WEBHOOK_URL}/webhook/discord/messages`, {
                                        serverName: guild.name,
                                        channelName: channel.name,
                                        author: message.author.username,
                                        content: message.content
                                    });
                                } catch (error) {
                                    console.error('Erreur lors de l\'envoi du webhook :', error.message);
                                }
                            }
                        });
                    }
                    resolve({
                        subscriptionId,
                        guildId: guild.id,
                        channelId: channel.id
                    });

                } catch (error) {
                    reject(error);
                }
            });
        });

    } catch (error) {
        console.error(`Erreur lors de la souscription à Discord pour userId: ${userId}, serverName: ${serverName}, channelName: ${channelName}`);
        console.error('Erreur complète:', error);
        throw error;
    }
};


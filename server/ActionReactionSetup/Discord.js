import Services from "../models/Services.js";
import Discord from "../models/Discord.js";
import axios from "axios";

import { Client, GatewayIntentBits } from "discord.js";
import discord from "../models/Discord.js";

const getGuildIdByName = (discordBot, serverName) => {
    const guild = discordBot.guilds.cache.find(guild => guild.name === serverName);
    if (!guild) {
        throw new Error(`Serveur avec le nom "${serverName}" non trouvé`);
    }
    return guild.id;
};

const getChannelIdByName = (discordBot, serverName, channelName) => {
    const guild = discordBot.guilds.cache.find(guild => guild.name === serverName);
    if (!guild) {
        throw new Error(`Serveur avec le nom "${serverName}" non trouvé`);
    }

    const channel = guild.channels.cache.find(channel => channel.name === channelName);
    if (!channel) {
        throw new Error(`Channel avec le nom "${channelName}" non trouvé dans le serveur "${serverName}"`);
    }

    return channel.id;
};


const SendDiscordMessage = async (params, discordBot) => {
    const { channelName, serverName, message } = params;

    if (!channelName || !serverName || !message) {
        throw new Error('Veuillez remplir tous les champs requis');
    }

    try {
        const serverId = getGuildIdByName(discordBot, serverName);
        const guild = discordBot.guilds.cache.get(serverId);
        if (!guild) {
            throw new Error('Serveur non trouvé');
        }

        const channelId = getChannelIdByName(discordBot, serverName, channelName);
        const channel = guild.channels.cache.get(channelId);
        if (!channel) {
            throw new Error('Channel non trouvé');
        }

        const response = await channel.send(message);
        console.log('Message envoyé:', response);

    } catch (error) {
        console.error('Erreur lors de l\'envoi du message et du départ du serveur:', error.response?.data || error.message);
        throw new Error('Erreur lors de l\'envoi du message ou du départ du serveur');
    }
}

export const ProduceDiscordReaction = async (reaction, userId, params) => {
    if (!userId) {
        throw new Error("User ID manquant pour exécuter la réaction GitHub.");
    }

    if (!params) {
        throw new Error("Params manquant pour exécuter la réaction GitHub.");
    }

    const service = await Services.findById(reaction.serviceId);
    if (!service || !service.reactions) {
        throw new Error('Service ou actions non trouvés');
    }

    const foundReaction = service.reactions.find(react => react._id.equals(reaction.reactionId));
    if (!foundReaction) {
        throw new Error('Reaction non trouvée');
    }

    const user = await Discord.findOne({ userId });
    if (!user || !user.accessToken) {
        throw new Error('Compte Discord non trouvé ou accessToken manquant');
    }

    if (foundReaction.name === 'Envoyer un message') {
        try {
            const discordBot = new Client({
                intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
            });

            await discordBot.login(process.env.DISCORD_BOT_TOKEN);

            discordBot.once('ready', async () => {
                console.log('Bot connecté et prêt !');

                await SendDiscordMessage(params, discordBot);
            });
        } catch (error) {
            throw error;
        }
    }
};

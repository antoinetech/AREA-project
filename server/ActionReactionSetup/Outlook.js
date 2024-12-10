import express from "express";
import axios from "axios";
import User from "../models/User.js";
import Services from "../models/Services.js";
import subscriptions from "../models/Subscriptions.js";
import Area from "../models/ARea.js";
import Outlook from "../models/Microsoft.js";
import {authenticateToken} from "../middlewares/Authentification.js";
import Github from "../models/Github.js";
import Microsoft from "../models/Microsoft.js";

const getUserIdFromEmail = async (email, accessToken) => {
    const url = `https://graph.microsoft.com/v1.0/users/${email}`;
    console.log(`[getUserIdFromEmail] Requête pour obtenir l'ID utilisateur avec l'email: ${email}`);

    try {
        const response = await axios.get(url, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        });

        const userId = response.data.id;
        console.log(`[getUserIdFromEmail] User ID récupéré pour ${email}: ${userId}`);
        return userId;
    } catch (error) {
        console.error('[getUserIdFromEmail] Erreur lors de la récupération de l\'ID utilisateur :', error.response?.data || error.message);
        throw error;
    }
};

const sendMessageInChat = async (chatId, message, accessToken) => {
    const url = `https://graph.microsoft.com/v1.0/chats/${chatId}/messages`;
    const messageData = {
        body: {
            content: message,
        },
    };
    console.log(`[sendMessageInChat] Envoi d'un message dans le chat ID: ${chatId}`);

    try {
        const response = await axios.post(url, messageData, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        });

        console.log('[sendMessageInChat] Message envoyé avec succès :', response.data);
        return response.data;
    } catch (error) {
        console.error('[sendMessageInChat] Erreur lors de l\'envoi du message :', error.response?.data || error.message);
        throw error;
    }
};

const getChatWithUser = async (userId, accessToken) => {
    const url = `https://graph.microsoft.com/v1.0/me/chats?$expand=members`;
    console.log(`[getChatWithUser] Requête pour obtenir les chats existants avec l'utilisateur ID: ${userId}`);

    try {
        const response = await axios.get(url, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        });

        const chats = response.data.value;
        console.log(`[getChatWithUser] Nombre de chats récupérés : ${chats.length}`);

        const existingChat = chats.find(chat =>
            chat.chatType === 'oneOnOne' &&
            chat.members.some(member => member.userId === userId)
        );

        if (existingChat) {
            console.log(`[getChatWithUser] Chat existant trouvé avec l'utilisateur ID: ${userId}, Chat ID: ${existingChat.id}`);
        } else {
            console.log(`[getChatWithUser] Aucun chat existant trouvé avec l'utilisateur ID: ${userId}`);
        }

        return existingChat ? existingChat.id : null;
    } catch (error) {
        console.error('[getChatWithUser] Erreur lors de la récupération des chats :', error.response?.data || error.message);
        throw error;
    }
};


const createOneOnOneChat = async (userId, accessToken) => {
    const url = `https://graph.microsoft.com/v1.0/chats`;
    const chatData = {
        chatType: 'oneOnOne',
        members: [
            {
                '@odata.type': '#microsoft.graph.aadUserConversationMember',
                roles: [],
                userId: userId,
            }
        ]
    };
    console.log(`[createOneOnOneChat] Création d'un nouveau chat one-on-one avec l'utilisateur ID: ${userId}`);

    try {
        const response = await axios.post(url, chatData, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        });

        console.log(`[createOneOnOneChat] Chat créé avec succès, Chat ID: ${response.data.id}`);
        return response.data.id;
    } catch (error) {
        console.error('[createOneOnOneChat] Erreur lors de la création du chat :', error.response?.data || error.message);
        throw error;
    }
};

const listTeamsChats = async (accessToken) => {
    const url = 'https://graph.microsoft.com/v1.0/me/chats';

    try {
        const response = await axios.get(url, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        });

        console.log('Chats list:', response.data.value);
        return response.data.value;
    } catch (error) {
        console.error('Error listing chats:', error.response?.data || error.message);
        throw error;
    }
};

const sendTeamsPrivateMessage = async (email, message, user) => {
    try {
        console.log(`[sendTeamsPrivateMessage] Début du processus pour envoyer un message à ${email}`);

        const toUserId = await getUserIdFromEmail(email, user.accessToken);
        console.log(`[sendTeamsPrivateMessage] ID de l'utilisateur récupéré pour ${email}: ${toUserId}`);

        let chatId = await getChatWithUser(toUserId, user.accessToken);

        if (!chatId) {
            console.log(`[sendTeamsPrivateMessage] Aucun chat existant trouvé. Création d'un nouveau chat avec l'utilisateur ID: ${toUserId}`);
            chatId = await createOneOnOneChat(toUserId, user.accessToken);
        }

        console.log(`[sendTeamsPrivateMessage] Envoi du message dans le chat ID: ${chatId}`);
        await sendMessageInChat(chatId, message, user.accessToken);

    } catch (error) {
        console.error('[sendTeamsPrivateMessage] Erreur lors de l\'envoi du message sur Teams :', error);
    }
};

const convertToISO8601 = (dateStr, timeStr) => {

    const [day, month, year] = dateStr.split('/');
    const [hour, minute] = timeStr.split(':');
    const date = new Date(Date.UTC(year, month - 1, day, hour, minute));
    return date.toISOString();
};

export const addEventWithConvertedDate = async (name, startDate, endDate, startHour, endHour, user) => {
    try {
        console.log('Début de la fonction addEventWithConvertedDate.');

        const startDateTime = convertToISO8601(startDate, startHour);
        const endDateTime = convertToISO8601(endDate, endHour);

        console.log('Date et heure de début en ISO 8601 :', startDateTime);
        console.log('Date et heure de fin en ISO 8601 :', endDateTime);

        const config = {
            headers: {
                Authorization: `Bearer ${user.accessToken}`,
                'Content-Type': 'application/json',
            },
        };

        const eventData = {
            subject: name,
            start: {
                dateTime: startDateTime,
                timeZone: 'Europe/Paris',
            },
            end: {
                dateTime: endDateTime,
                timeZone: 'Europe/Paris',
            }
        };

        const response = await axios.post('https://graph.microsoft.com/v1.0/me/events', eventData, config);

        console.log('Événement ajouté avec succès :', response.data);
        return response.data;
    } catch (error) {
        console.error('Erreur lors de l\'ajout de l\'événement au calendrier Outlook :', error.response?.data || error.message);
        throw error;
    }
};

export const SendOutlookEmail = async (to, subject, body, user) => {
    const config = {
        headers: {
            Authorization: `Bearer ${user.accessToken}`,
            'Content-Type': 'application/json',
        },
    };
    const data = {
        message: {
            subject: subject,
            body: {
                contentType: 'Text',
                content: body,
            },
            toRecipients: [
                {
                    emailAddress: {
                        address: to,
                    },
                },
            ],
        },
        saveToSentItems: 'true',
    };
    try {
        const response = await
            axios.post('https://graph.microsoft.com/v1.0/me/sendMail', data, config);
        return response.data;
    } catch (error) {
        console.error("Erreur lors de l'envoi du mail Outlook:", error.response?.data || error.message);
        throw new Error('Erreur lors de l\'envoi du mail Outlook.');
    }
}

export const ProduceOutlookReaction = async (reaction, userId, params) => {
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

    const user = await Microsoft.findOne({ userId });
    if (!user || !user.accessToken) {
        throw new Error('Compte GitHub non trouvé ou accessToken manquant');
    }

    if (foundReaction.name === 'Envoyer un mail') {
        try {
            const { to, subject, body } = params;
            if (!to || !subject || !body) {
                throw new Error('Paramètres manquants pour envoyer un mail');
            }
            await SendOutlookEmail(to, subject, body, user);
        } catch (error) {
            if (error.message.includes('Le dépôt') && error.message.includes('existe déjà')) {
                console.warn("Attention :", error.message);
            } else {
                console.error("Erreur lors de la création du répertoire GitHub:", error.message);
            }
            throw error;
        }
    }
    if (foundReaction.name === 'Ajouter un événement') {
        try {
            const { name, startDate, endDate, startHour, endHour } = params;
            if (!name || !startDate || !endDate) {
                throw new Error('Paramètres manquants pour ajouter un événement');
            }
            await addEventWithConvertedDate(name, startDate, endDate, startHour, endHour, user);
        } catch (error) {
            console.error("Erreur lors de l'ajout de l'événement au calendrier Outlook:", error.message);
            throw error;
        }
    }
    if (foundReaction.name === 'Envoyer un message privé') {
        try {
            const { email, message } = params;
            if (!email || !message) {
                throw new Error('Paramètres manquants pour envoyer un message privé Teams');
            }
            await sendTeamsPrivateMessage(email, message, user);
        } catch (error) {
            console.error("Erreur lors de l'envoi du message privé Teams:", error.message);
            throw error;
        }
    }
};


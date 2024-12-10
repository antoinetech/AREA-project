import express from "express";
import axios from "axios";
import User from "../models/User.js";
import Services from "../models/Services.js";
import Microsoft from "../models/Microsoft.js";
import Subscriptions from "../models/Subscriptions.js";
import Subscription from "../models/Subscriptions.js";
import {deleteAreaByName} from "../ActionReactionSetup/ActionReactionRouteManagement.js";
import Area from "../models/ARea.js";

export const unsubscribeOutlookWebhook = async (subscriptionId, accessToken) => {
    try {
        const config = {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            }
        };
        const url = `https://graph.microsoft.com/v1.0/subscriptions/${subscriptionId}`;

        const response = await axios.delete(url, config);
        return response.data;
    } catch (error) {
        console.error('Erreur lors de la désinscription du webhook Outlook:', error.response?.data || error.message);
        throw new Error('Erreur lors de la désinscription du webhook Outlook');
    }
};

const updateTokens = async (userId, accessToken, refreshToken, expiresIn) => {
    await Microsoft.findOneAndUpdate(
        { userId },
        {
            $set: {
                accessToken: accessToken,
                refreshToken: refreshToken,
                expires_in: new Date(Date.now() + expiresIn * 1000)
            }
        },
        { new: true, upsert: false }
    );
};

const testToken = async (accessToken) => {
    try {
        const config = {
            headers: { Authorization: `Bearer ${accessToken}` }
        };
        const response = await axios.get('https://graph.microsoft.com/v1.0/me', config);
        console.log('Le token est valide:', response.data);
        return true;
    } catch (error) {
        console.error('Erreur de validation du nouveau token:', error.response?.data || error.message);
        return false;
    }
};

export const renewMicrosoftAccessToken = async (refreshToken, userId) => {
    const tokenUrl = `https://login.microsoftonline.com/consumers/oauth2/v2.0/token`;
    const params = new URLSearchParams({
        client_id: process.env.MICROSOFT_CLIENT_ID,
        client_secret: process.env.MICROSOFT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
        scope: 'openid profile offline_access email User.Read Mail.Read Mail.ReadWrite Mail.Send Calendars.Read Calendars.ReadWrite'
    });

    try {
        console.log('Tentative de renouvellement du token pour l\'utilisateur:', userId);
        const response = await axios.post(tokenUrl, params, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        const { access_token, refresh_token, expires_in } = response.data;
        console.log('Nouveau token reçu:', access_token);
        console.log('Nouveau refresh token reçu:', refresh_token);

        await updateTokens(userId, access_token, refresh_token, expires_in);
        console.log('Mise à jour des tokens réussie');

        const isValid = await testToken(access_token);
        if (!isValid) {
            throw new Error('Le nouveau token est invalide après renouvellement');
        }

    } catch (error) {
        console.error('Erreur lors du renouvellement du token:', error.response?.data || error.message);

        if (error.response?.data?.error === 'invalid_grant') {
            console.log('Le refresh token a expiré, suppression du compte, des souscriptions et des Areas liées.');

            await deleteMicrosoftSubscriptionsAndAreas(userId);
            await Microsoft.findOneAndDelete({ userId });
            await User.findByIdAndDelete(userId);
        }

        throw error;
    }
};

const deleteMicrosoftSubscriptionsAndAreas = async (userId) => {
    try {
        const services = await Services.find({ name: { $in: ['Outlook', 'Microsoft-Calendar'] } });
        const serviceIds = services.map(service => service._id);

        await Subscription.deleteMany({ userId, serviceId: { $in: serviceIds } });
        console.log('Souscriptions Microsoft supprimées avec succès.');

        const areasToDelete = await Area.find({
            userId,
            $or: [
                { "action.serviceId": { $in: serviceIds } },
                { "reactions.serviceId": { $in: serviceIds } }
            ]
        });

        for (const area of areasToDelete) {
            console.log(`Suppression de l'Area : ${area.name}`);
            const deleteResult = await deleteAreaByName(area.name, userId);
            if (!deleteResult.success) {
                console.error(`Erreur lors de la suppression de l'Area : ${area.name}`);
            }
        }
    } catch (error) {
        console.error('Erreur lors de la suppression des souscriptions et des Areas:', error);
    }
};


export const suscribeOutlook = async (serviceId, ActionId, userId) => {
    try {
        console.log('Début de la fonction suscribeOutlook.');

        const service = await Services.findById(serviceId);
        console.log('Service trouvé :', service);

        if (!service || !service.actions) {
            throw new Error('Service ou actions non trouvés');
        }

        const action = service.actions.find(act => act._id.equals(ActionId));
        console.log('Action trouvée :', action);

        if (!action) {
            throw new Error('Action non trouvée');
        }

        const user = await Microsoft.findOne({ userId });
        console.log('Utilisateur trouvé :', user);

        if (!user || !user.accessToken) {
            throw new Error('Compte Microsoft non trouvé ou accessToken manquant');
        }

        const accessToken = user.accessToken;
        console.log('Access Token récupéré :', accessToken);

        if (action.name === 'Recevoir un mail') {
            console.log('Souscription à l\'action "Recevoir un mail".');

            const config = {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            };
            const data = {
                changeType: 'created',
                notificationUrl: `${process.env.WEBHOOK_URL}/webhook/outlook/controller`,
                resource: 'me/mailFolders(\'Inbox\')/messages',
                expirationDateTime: new Date(Date.now() + 4230 * 60 * 1000).toISOString(),
                clientState: `${process.env.OUTLOOK_CLIENTSTATE}`
            };

            console.log('Données de souscription pour les mails :', data);

            try {
                const response = await axios.post(
                    'https://graph.microsoft.com/v1.0/subscriptions', data, config
                );
                console.log('Réponse de la souscription aux mails :', response.data);
                return response.data.id;
            } catch (error) {
                console.error('Erreur lors de la requête de souscription à l\'API Microsoft pour les mails:', error.message);
                if (error.response) {
                    console.error('Status:', error.response.status);
                    console.error('Data:', error.response.data);
                }
                throw error;
            }
        }

        if (action.name === "Détection d'un nouvel évènement") {
            console.log('Souscription à l\'action "Détection d\'un nouvel évènement".');

            const config = {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            };
            const data = {
                changeType: 'created',
                notificationUrl: `${process.env.WEBHOOK_URL}/webhook/outlook/controller`,
                resource: 'me/events',
                expirationDateTime: new Date(Date.now() + 4230 * 60 * 1000).toISOString(),
                clientState: `${process.env.OUTLOOK_CLIENTSTATE}`
            };

            console.log('Données de souscription pour les événements :', data);

            try {
                const response = await axios.post(
                    'https:Fgraph.microsoft.com/v1.0/subscriptions', data, config
                );
                console.log('Réponse de la souscription aux événements :', response.data);
                return response.data.id;
            } catch (error) {
                console.error('Erreur lors de la requête de souscription à l\'API Microsoft pour les événements:', error.message);
                if (error.response) {
                    console.error('Status:', error.response.status);
                    console.error('Data:', error.response.data);
                }
                throw error;
            }
        }
    } catch (error) {
        console.error('Erreur dans la fonction suscribeOutlook :', error);
        throw error;
    }
};



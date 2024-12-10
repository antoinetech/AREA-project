import axios from 'axios';
import TwitchAccount from '../models/Twitch.js';
import Services from '../models/Services.js';
import Subscription from '../models/Subscriptions.js';
import {deleteAreaByName} from "../ActionReactionSetup/ActionReactionRouteManagement.js";
import {getServiceIdByName} from "../subscriptionRoutes/SubscriptionManagement.js";
import Area from "../models/ARea.js";

export async function renewTwitchAccessToken(refreshToken, userId) {
    const tokenUrl = 'https://id.twitch.tv/oauth2/token';

    const params = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: process.env.TWITCH_CLIENT_ID,
        client_secret: process.env.TWITCH_SECRET
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

        const refreshAccount = await TwitchAccount.findOneAndUpdate(
            { userId: userId },
            update,
            { new: true, upsert: false }
        );

        if (!refreshAccount) {
            console.error('Aucun compte Twitch trouvé pour cet utilisateur');
        } else {
            console.log('Compte Twitch mis à jour avec succès', refreshAccount);
        }
        return true;
    } catch (error) {
        console.error('Erreur lors du renouvellement du token Twitch:', error.response?.data || error.message);

        if (error.response && error.response.status === 400 && error.response.data.error === 'invalid_grant') {
            try {
                console.log("Refresh token invalide pour Twitch. Suppression des données associées...");

                const twitchService = await getServiceIdByName("Twitch");
                if (!twitchService) {
                    console.error("Service Twitch non trouvé, impossible de supprimer les souscriptions et les Areas.");
                    return false;
                }

                const areasToDelete = await Area.find({
                    userId,
                    $or: [
                        { "action.serviceId": twitchService._id },
                        { "reactions.serviceId": twitchService._id },
                    ],
                });

                if (areasToDelete.length > 0) {
                    console.log(`Areas associées à Twitch trouvées, nombre : ${areasToDelete.length}`);

                    for (const area of areasToDelete) {
                        console.log(`Suppression de l'Area : ${area.name}`);
                        const deleteResult = await deleteAreaByName(area.name, userId);
                        if (!deleteResult.success) {
                            console.error(`Erreur lors de la suppression de l'Area : ${area.name}`);
                        }
                    }
                }

                await Subscription.deleteOne({ userId, serviceId: twitchService._id });
                console.log(`Souscription Twitch supprimée pour l'utilisateur : ${userId}`);

                await TwitchAccount.deleteOne({ userId });
                console.log(`Compte Twitch supprimé de la base de données pour l'utilisateur : ${userId}`);
            } catch (deleteError) {
                console.error('Erreur lors de la suppression des données associées à Twitch:', deleteError.message);
            }
        }
        return false;
    }
}

import express from "express";
import axios from "axios";
import User from "../models/User.js";
import Services from "../models/Services.js";
import Spotify from "../models/Spotify.js";
import Subscriptions from "../models/Subscriptions.js";
import Subscription from "../models/Subscriptions.js";
import {deleteAreaByName} from "../ActionReactionSetup/ActionReactionRouteManagement.js";
import {getServiceIdByName} from "../subscriptionRoutes/SubscriptionManagement.js";
import Area from "../models/ARea.js";

export async function renewSpotifyAccessToken(refreshToken, userId) {
    const tokenUrl = 'https://accounts.spotify.com/api/token';

    const params = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: process.env.SPOTIFY_CLIENT_ID,
        client_secret: process.env.SPOTIFY_SECRET
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

        const refreshAccount = await Spotify.findOneAndUpdate(
            { userId: userId },
            update,
            { new: true, upsert: false }
        );

        if (!refreshAccount) {
            console.error('Aucun compte Spotify trouvé pour cet utilisateur');
        } else {
            console.log('Compte Spotify mis à jour avec succès', refreshAccount);
        }
        return true;
    } catch (error) {
        console.error('Erreur lors du renouvellement du token Spotify:', error.response?.data || error.message);

        if (error.response && error.response.status === 400 && error.response.data.error === 'invalid_grant') {
            try {
                console.log("Refresh token invalide pour Spotify. Suppression des données associées...");

                const spotifyService = await getServiceIdByName("Spotify");
                if (!spotifyService) {
                    console.error("Service Spotify non trouvé, impossible de supprimer les souscriptions et les Areas.");
                    return false;
                }

                const areasToDelete = await Area.find({
                    userId,
                    $or: [
                        { "action.serviceId": spotifyService._id },
                        { "reactions.serviceId": spotifyService._id },
                    ],
                });

                if (areasToDelete.length > 0) {
                    console.log(`Areas associées à Spotify trouvées, nombre : ${areasToDelete.length}`);

                    for (const area of areasToDelete) {
                        console.log(`Suppression de l'Area : ${area.name}`);
                        const deleteResult = await deleteAreaByName(area.name, userId);
                        if (!deleteResult.success) {
                            console.error(`Erreur lors de la suppression de l'Area : ${area.name}`);
                        }
                    }
                }

                await Subscription.deleteOne({ userId, serviceId: spotifyService._id });
                console.log(`Souscription Spotify supprimée pour l'utilisateur : ${userId}`);

                await Spotify.deleteOne({ userId });
                console.log(`Compte Spotify supprimé de la base de données pour l'utilisateur : ${userId}`);
            } catch (deleteError) {
                console.error('Erreur lors de la suppression des données associées à Spotify:', deleteError.message);
            }
        }
        return false;
    }
}


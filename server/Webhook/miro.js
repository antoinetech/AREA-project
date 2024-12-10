import express from "express";
import axios from "axios";
import User from "../models/User.js";
import Services from "../models/Services.js";
import Miro from "../models/Miro.js";
import Subscriptions from "../models/Subscriptions.js";
import Subscription from "../models/Subscriptions.js";
import {deleteAreaByName} from "../ActionReactionSetup/ActionReactionRouteManagement.js";
import Area from "../models/ARea.js";
import {getServiceIdByName} from "../subscriptionRoutes/SubscriptionManagement.js";

export const unsuscribeMiro = async (subscriptionId, accessToken) => {
    try {
        const config = {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            }
        };

        const url = `https://api.miro.com/v2-experimental/webhooks/subscriptions/${subscriptionId}`;

        const response = await axios.delete(url, config);
        console.log('Webhook désinscrit avec succès:', response.data);
        return response.data;
    } catch (error) {
        console.error('Erreur lors de la désinscription du webhook Miro:', error.response?.data || error.message);
        throw new Error('Erreur lors de la désinscription du webhook Miro');
    }
};

export const fetchBoardIdByName = async (boardName, accessToken) => {
    try {
        console.log('Fetching boards with accessToken:', accessToken);
        const response = await fetch('https://api.miro.com/v2/boards', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (!response.ok) {
            console.log('Failed to fetch boards, status:', response.status);
            throw new Error('Erreur lors de la récupération des boards');
        }

        const data = await response.json();
        console.log('Boards data:', data);
        const board = data.data.find(b => b.name === boardName);

        if (!board) {
            console.log('Board not found with name:', boardName);
            throw new Error('Board non trouvé');
        }

        console.log('Board found:', board);
        return board.id;
    } catch (error) {
        console.error('Error in fetchBoardIdByName:', error);
        throw error;
    }
};

export const suscribeMiro = async (serviceId, ActionId, userId, actionParams) => {
    try {
        const service = await Services.findById(serviceId);
        if (!service || !service.actions) throw new Error('Service ou actions non trouvés');

        const action = service.actions.find(act => act._id.equals(ActionId));
        if (!action) throw new Error('Action non trouvée');

        const user = await Miro.findOne({ userId });
        if (!user || !user.accessToken) throw new Error('Compte Miro non trouvé ou accessToken manquant');

        const boardName = actionParams['board_name'];
        if (!boardName) throw new Error('Paramètre "board_name" manquant');

        const boardId = await fetchBoardIdByName(boardName, user.accessToken);

        const callbackUrl = `${process.env.WEBHOOK_URL}/webhook/miro/controller`;
        console.log('Webhook Callback URL:', callbackUrl);

        if (action.name === "Détecter l'ajout d'un item dans un board") {
            const payload = {
                boardId: boardId,
                callbackUrl: callbackUrl,
                event: "item.created",
                status: 'enabled'
            };

            const config = {
                method: 'post',
                maxBodyLength: Infinity,
                url: 'https://api.miro.com/v2-experimental/webhooks/board_subscriptions',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.accessToken}`
                },
                data: JSON.stringify(payload)
            };

            const response = await axios(config);

            console.log('Webhook créé avec succès:', response.data);
            return {
                subscriptionId: response.data.id,
                boardId: boardId
            };
        }
    } catch (error) {
        console.error('Error in suscribeMiro:', error.response ? error.response.data : error.message);
        throw error;
    }
};

export const checkMiroToken = async (userId) => {
    try {
        const miroAccount = await Miro.findOne({ userId });
        if (!miroAccount) {
            console.error("Compte Miro introuvable pour l'utilisateur:", userId);
            return false;
        }

        const config = {
            headers: { Authorization: `Bearer ${miroAccount.accessToken}` }
        };

        const response = await axios.get('https://api.miro.com/v1/users/me', config);
        if (response.status === 200) {
            console.log("Token Miro valide pour l'utilisateur:", userId);
            return true;
        }
    } catch (error) {
        console.error("Erreur lors de la vérification du token Miro:", error.response?.data || error.message);

        if (error.response?.status === 401) {
            console.log("Token invalide, suppression du compte Miro, des souscriptions et des Areas pour l'utilisateur:", userId);

            try {
                const miroService = await getServiceIdByName('Miro');
                if (!miroService) {
                    console.error("Service Miro introuvable, impossible de supprimer les souscriptions et les Areas.");
                    return false;
                }

                const areasToDelete = await Area.find({
                    userId,
                    $or: [
                        { "action.serviceId": miroService._id },
                        { "reactions.serviceId": miroService._id },
                    ],
                });

                if (areasToDelete.length > 0) {
                    console.log(`Areas associées à Miro trouvées, nombre : ${areasToDelete.length}`);

                    for (const area of areasToDelete) {
                        console.log(`Suppression de l'Area : ${area.name}`);
                        const deleteResult = await deleteAreaByName(area.name, userId);
                        if (!deleteResult.success) {
                            console.error(`Erreur lors de la suppression de l'Area : ${area.name}`);
                        }
                    }
                }

                await Subscription.deleteMany({ userId, serviceId: miroService._id });
                console.log(`Souscriptions Miro supprimées pour l'utilisateur : ${userId}`);

                await Miro.findOneAndDelete({ userId });
                console.log(`Compte Miro supprimé de la base de données pour l'utilisateur : ${userId}`);
            } catch (deleteError) {
                console.error("Erreur lors de la suppression des données associées à Miro:", deleteError.message);
            }
        }
    }
    return false;
};
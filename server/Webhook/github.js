import express from "express";
import axios from "axios";
import User from "../models/User.js";
import Services from "../models/Services.js";
import Github from "../models/Github.js";
import Microsoft from "../models/Microsoft.js";

export const unsubscribeGithubWebhook = async (subscriptionId, accessToken, owner, repo) => {
    try {
        const config = {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            }
        };
        const url = `https://api.github.com/repos/${owner}/${repo}/hooks/${subscriptionId}`;
        const response = await axios.delete(url, config);
        return response.data;
    } catch (error) {
        console.error('Erreur lors de la désinscription du webhook GitHub:', error.response?.data || error.message);
        throw new Error('Erreur lors de la désinscription du webhook GitHub');
    }
};

export const suscribeGithub = async (serviceId, ActionId, userId, actionParams) => {
    try {
        const service = await Services.findById(serviceId);
        if (!service || !service.actions) {
            throw new Error('Service ou actions non trouvés');
        }
        const action = service.actions.find(act => act._id.equals(ActionId));
        if (!action) {
            throw new Error('Action non trouvée');
        }
        const nameRepo = actionParams['name_repo'];
        if (!nameRepo) {
            throw new Error('Paramètre "name_repo" manquant');
        }
        const username = actionParams['username'];
        if (!username) {
            throw new Error('Paramètre "username" manquant');
        }
        const user = await Github.findOne({ userId });
        if (!user || !user.accessToken) {
            throw new Error('Compte Github non trouvé ou accessToken manquant');
        }
        const accessToken = user.accessToken;

        if (action.name === 'Détection de nouveaux commits') {
            const config = {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            };
            const data = {
                name: 'web',
                active: true,
                events: ['push'],
                config: {
                    url: `${process.env.WEBHOOK_URL}/webhook/github/controller`,
                    content_type: 'json',
                },
            };
            const existingHooks = await
                axios.get(`https://api.github.com/repos/${user.username}/${nameRepo}/hooks`, config);
            const webhookUrl = `${process.env.WEBHOOK_URL}/webhook/github/controller`;
            const hookExists = existingHooks.data.some(hook => hook.config.url === webhookUrl);

            if (hookExists) {
                return;
            }
            try {
                const response = await
                    axios.post(`https://api.github.com/repos/${username}/${nameRepo}/hooks`, data, config);
                return response.data.id;

            } catch (error) {
                console.error('Erreur lors de la création du webhook Github:', error.response?.data || error.message);
                throw new Error('Erreur lors de la création du webhook Github');
            }

        }
    } catch (error) {
        console.error('Erreur lors de la création du webhook Github:', error.message);
        throw new Error('Erreur lors de la création du webhook Github');
    }
}

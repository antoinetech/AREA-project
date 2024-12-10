import {LinkActionToReaction} from "../ActionReactionSetup/ProduceReaction.js";
import express from "express";

const router = express.Router();

router.post('/controller', async (req, res) => {
    try {
        console.log('Webhook reçu.');

        if (req.query && req.query.validationToken) {
            console.log('Validation token reçu :', req.query.validationToken);
            return res.status(200).send(req.query.validationToken);
        }

        const expectedClientState = `${process.env.OUTLOOK_CLIENTSTATE}`;
        console.log('Client state attendu :', expectedClientState);

        if (!req.body) {
            console.log('Requête vide');
            return res.status(400).send('Requête vide');
        }
        console.log('Corps de la requête reçu :', req.body);

        const { value } = req.body;
        console.log('Valeur reçue :', value);

        if (!value || !Array.isArray(value) || value.length === 0) {
            console.log('Valeur de notification incorrecte');
            return res.status(400).send('Valeur de notification incorrecte');
        }

        const invalidClientState = value.some(notification => notification.clientState !== expectedClientState);
        if (invalidClientState) {
            console.log('Client state invalide');
            return res.status(400).send('Invalid clientState');
        }
        console.log('Client state validé.');

        for (let i = 0; i < value.length; i++) {
            const notification = value[i];
            const { changeType, resource } = notification;
            console.log(`Notification ${i + 1} :`, notification);
            console.log('Type de changement :', changeType);
            console.log('Ressource :', resource);

            if (resource.toLowerCase().includes('mailfolders') && changeType.toLowerCase() === 'created') {
                try {
                    console.log(`Nouveau mail détecté dans la ressource: ${resource}`);
                    await LinkActionToReaction(notification.subscriptionId);
                    console.log('Action liée à un mail exécutée.');
                } catch (error) {
                    console.error(`Erreur lors du traitement du mail pour la notification ${i + 1}:`, error);
                }
            }

            if (resource.toLowerCase().includes('events') && changeType.toLowerCase() === 'created') {
                try {
                    console.log(`Nouvel événement détecté dans la ressource: ${resource}`);
                    await LinkActionToReaction(notification.subscriptionId);
                    console.log('Action liée à un événement exécutée.');
                } catch (error) {
                    console.error(`Erreur lors du traitement de l'événement pour la notification ${i + 1}:`, error);
                }
            }
        }

        console.log('Toutes les notifications ont été traitées.');
        res.sendStatus(202);
    } catch (error) {
        console.error('Erreur interne du serveur :', error);
        res.status(500).send('Erreur interne du serveur');
    }
});



export default router;
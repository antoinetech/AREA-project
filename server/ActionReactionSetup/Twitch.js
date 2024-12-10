import axios from "axios";
import Services from "../models/Services.js";
import Twitch from "../models/Twitch.js";


const updateTwitchUserDescription = async (accessToken, description) => {
    try {
        const config = {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Client-Id': process.env.TWITCH_CLIENT_ID,
                'Content-Type': 'application/json'
            }
        };

        const response = await axios.put(`https://api.twitch.tv/helix/users?description=${encodeURIComponent(description)}`, {}, config);

        console.log('Réponse après mise à jour du profil Twitch:', response.data);
        return response.data;
    } catch (error) {
        console.error('Erreur lors de la mise à jour du profil Twitch:', error.response?.data || error.message);
        throw new Error('Erreur lors de la mise à jour du profil Twitch');
    }
};

export const ProduceTwitchReaction = async (reaction, userId, params) => {
    if (!userId) {
        throw new Error("User ID manquant pour exécuter la réaction Twitch.");
    }

    const service = await Services.findById(reaction.serviceId);
    if (!service || !service.reactions) {
        throw new Error('Service ou actions non trouvés');
    }

    const foundReaction = service.reactions.find(react => react._id.equals(reaction.reactionId));
    if (!foundReaction) {
        throw new Error('Reaction non trouvée');
    }

    const user = await Twitch.findOne({ userId });
    if (!user || !user.accessToken) {
        throw new Error('Compte Twitch non trouvé ou accessToken manquant');
    }

    if (foundReaction.name === "Mettre à jour la description de l'utilisateur") {
        try {
            const { description } = params;
            if (!description) {
                throw new Error('Paramètre "username" manquant');
            }

            await updateTwitchUserDescription(user.accessToken, description);

        } catch (error) {
            console.error('Erreur lors de l\'abonnement à l\'utilisateur Twitch :', error.message);
            throw error;
        }
    }
};
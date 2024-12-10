import Services from "../models/Services.js";
import Twitter from '../models/Twitter.js';
import axios from "axios";

const createTweet = async (params, twitterAccount) => {
    const { content } = params;

    if (!content) {
        throw new Error('Veuillez fournir le contenu du tweet');
    }

    try {
        const config = {
            headers: {
                Authorization: `Bearer ${twitterAccount.accessToken}`,
                'Content-Type': 'application/json',
            },
        };

        const data = { text: content };

        const response = await axios.post('https://api.twitter.com/2/tweets', data, config);
        return response.data;
    } catch (error) {
        console.error('Erreur lors de la création du tweet sur Twitter:', error.response?.data || error.message);
        throw new Error('Erreur lors de la création du tweet sur Twitter');
    }
};

export const ProduceTwitterReaction = async (reaction, userId, params) => {
    if (!userId) {
        throw new Error("User ID manquant pour exécuter la réaction Twitter.");
    }

    if (!params) {
        throw new Error("Params manquant pour exécuter la réaction Twitter.");
    }

    const service = await Services.findById(reaction.serviceId);
    if (!service || !service.reactions) {
        throw new Error('Service ou actions non trouvés');
    }

    const foundReaction = service.reactions.find(react => react._id.equals(reaction.reactionId));
    if (!foundReaction) {
        throw new Error('Reaction non trouvée');
    }

    const user = await Twitter.findOne({ userId });
    if (!user || !user.accessToken) {
        throw new Error('Compte Twitter non trouvé ou accessToken manquant');
    }

    if (foundReaction.name === 'Créer un tweet') {
        try {
            const { content } = params;
            if (!content) {
                throw new Error('Paramètres manquants pour créer un tweet');
            }
            await createTweet({ content }, user);
        } catch (error) {
            console.error("Erreur lors de la création du tweet :", error.message);
            throw error;
        }
    }

};



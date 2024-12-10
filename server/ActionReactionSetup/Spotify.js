import Services from "../models/Services.js";
import Spotify from "../models/Spotify.js";
import axios from "axios";

const createPlaylist = async (params, spotifyAccount) => {
    const { name, description, privacy } = params;

    if (!name || !description || typeof privacy === 'undefined') {
        throw new Error('Veuillez remplir tous les champs requis');
    }
    const privacy_bool = privacy === 'true' || privacy === true ? true :
        privacy === 'false' || privacy === false ? false : false;

    try {
        const config = {
            headers: {
                Authorization: `Bearer ${spotifyAccount.accessToken}`,
                'Content-Type': 'application/json',
            },
        };

        const data = {
            name: name,
            description: description,
            public: privacy_bool,
        };

        const response = await axios.post(`https://api.spotify.com/v1/users/${spotifyAccount.spotifyId}/playlists`, data, config);
        return response.data;
    } catch (error) {
        console.error('Erreur lors de la création de la playlist Spotify:', error.response?.data || error.message);
        throw new Error('Erreur lors de la création de la playlist Spotify');
    }
};

const pauseSpotifyPlayback = async (spotifyAccount) => {
    try {
        const config = {
            headers: {
                Authorization: `Bearer ${spotifyAccount.accessToken}`,
                'Content-Type': 'application/json',
            },
        };

        const response = await axios.put('https://api.spotify.com/v1/me/player/pause', {}, config);
        return response.data;
    } catch (error) {
        console.error('Erreur lors de la pause de la lecture sur Spotify:', error.response?.data || error.message);
        throw new Error('Erreur lors de la pause de la lecture sur Spotify');
    }
};


export const ProduceSpotifyReaction = async (reaction, userId, params) => {
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

    const user = await Spotify.findOne({ userId });
    if (!user || !user.accessToken) {
        throw new Error('Compte Spotify non trouvé ou accessToken manquant');
    }

    if (foundReaction.name === 'Créer une nouvelle playlist') {
        try {
            const { name, description, privacy } = params;
            if (!name || !description || !privacy) {
                throw new Error('Paramètres manquants pour envoyer un mail');
            }
            const privacy_bool = privacy === 'true' || privacy === true ? true : false;
            await createPlaylist({ name, description, privacy: privacy_bool }, user);
        } catch (error) {
            if (error.message.includes('Le dépôt') && error.message.includes('existe déjà')) {
                console.warn("Attention :", error.message);
            } else {
                console.error("Erreur lors de la création du répertoire GitHub:", error.message);
            }
            throw error;
        }
    }
    if (foundReaction.name === 'Mettre en pause la lecture') {
        try {
            await pauseSpotifyPlayback(user);
        } catch (error) {
            throw error;
        }
    }
};
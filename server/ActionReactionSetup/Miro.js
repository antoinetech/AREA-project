import Services from "../models/Services.js";
import Miro from "../models/Miro.js";
import {fetchBoardIdByName} from "../Webhook/miro.js";
import axios from "axios";

const AddingFrameA4InBoard = async (params, miroAccount) => {
    const { board_name, title } = params;

    if (!board_name || !title) {
        throw new Error('Veuillez remplir tous les champs requis');
    }

    try {
        const boardId = await fetchBoardIdByName(board_name, miroAccount.accessToken);

        const config = {
            headers: {
                Authorization: `Bearer ${miroAccount.accessToken}`,
                'Content-Type': 'application/json',
            },
        };

        const data = {
            data: {
                format: "custom",
                title: title,
                type: "freeform",
                showContent: true,
            },
            style: {
                fillColor: '#ffffffff',
            },
            position: {
                x: 100,
                y: 100,
            },
            geometry: {
                height: 1123,
                width: 794,
            },
        };

        const response = await axios.post(`https://api.miro.com/v2/boards/${boardId}/frames`, data, config);

        return response.data;
    } catch (error) {
        if (error.response?.data) {
            console.error('Erreur lors de l\'ajout de la frame A4 dans le tableau Miro:', error.response.data);
        }
        throw error;
    }
};



const AddingShapeInBoard = async (params, miroAccount) => {
    const { board_name, content } = params;

    if (!board_name || !content) {
        throw new Error('Veuillez remplir tous les champs requis');
    }

    try {
        const boardId = await fetchBoardIdByName(board_name, miroAccount.accessToken);

        const config = {
            headers: {
                Authorization: `Bearer ${miroAccount.accessToken}`,
                'Content-Type': 'application/json',
            },
        };

        const data = {
            data: {
                content: content,
                shape: 'circle',
            },
            style: {
                fillColor: '#ff0000',
                textAlign: 'center',
                textAlignVertical: 'middle',
                borderColor: '#000000',
                borderWidth: 2,
            },
            position: {
                x: 100,
                y: 100,
                origin: 'center',
            },
            geometry: {
                width: 200,
            },
        };

        const response = await axios.post(`https://api.miro.com/v2/boards/${boardId}/shapes`, data, config);

        return response.data;
    } catch (error) {
        console.error('Erreur lors de la création de la forme dans le tableau Miro:', error.response?.data || error.message);
        throw error;
    }
};


const AddingStickyNoteInBoard = async (params, miroAccount) => {
    const { board_name, content } = params;

    if (!board_name || !content) {
        throw new Error('Veuillez remplir tous les champs requis');
    }

    try {
        const boardId = await fetchBoardIdByName(board_name, miroAccount.accessToken);

        const config = {
            headers: {
                Authorization: `Bearer ${miroAccount.accessToken}`,
                'Content-Type': 'application/json',
            },
        };

        const data = {
            data: {
                content: content,
                shape: 'square',
            },
            style: {
                fillColor: 'light_yellow',
                textAlign: 'center',
                textAlignVertical: 'top',
            },
            position: {
                x: 0,
                y: 0,
            },
        };

        const response = await axios.post(`https://api.miro.com/v2/boards/${boardId}/sticky_notes`, data, config);
        return response.data;
    } catch (error) {
        console.error('Erreur lors de l\'ajout du pense-bête dans le tableau Miro:', error.response?.data || error.message);
        throw error;
    }
};


const AddingTextInBoard = async (params, miroAccount) => {
    const { board_name, text } = params;

    if (!board_name || !text) {
        throw new Error('Veuillez remplir tous les champs requis');
    }

    try {

        const boardId = await fetchBoardIdByName(board_name, miroAccount.accessToken);

        const config = {
            headers: {
                Authorization: `Bearer ${miroAccount.accessToken}`,
                'Content-Type': 'application/json',
            },
        };

        const data = {
            data: {
                content: text
            },
            position: {
                x: 0,
                y: 0
            },
            style: {
                fontSize: 60,
            }
        };

        const response = await axios.post(`https://api.miro.com/v2/boards/${boardId}/texts`, data, config);
        return response.data;
    } catch (error) {
        console.error('Erreur lors de l\'ajout de texte dans le tableau Miro:', error.response?.data || error.message);
        throw new Error('Erreur lors de l\'ajout de texte dans le tableau Miro');
    }
}

export const ProduceMiroReaction = async (reaction, userId, params) => {
    if (!userId) {
        throw new Error("User ID manquant pour exécuter la réaction Miro.");
    }

    if (!params) {
        throw new Error("Params manquant pour exécuter la réaction Miro.");
    }

    const service = await Services.findById(reaction.serviceId);
    if (!service || !service.reactions) {
        throw new Error('Service ou actions non trouvés');
    }

    const foundReaction = service.reactions.find(react => react._id.equals(reaction.reactionId));
    if (!foundReaction) {
        throw new Error('Reaction non trouvée');
    }

    const user = await Miro.findOne({ userId });
    if (!user || !user.accessToken) {
        throw new Error('Compte Miro non trouvé ou accessToken manquant');
    }

    if (foundReaction.name === 'Créer un item texte dans un board') {
        try {
            await AddingTextInBoard(params, user);
        } catch (error) {
            console.error("Erreur lors de l'ajout du texte dans le board Miro:", error.message);
            throw error;
        }
    }
    if (foundReaction.name === 'Créer un post-it dans un board') {
        try {
            await AddingStickyNoteInBoard(params, user);
        } catch (error) {
            console.error("Erreur lors de l'ajout du post-it dans le board Miro:", error.message);
            throw error;
        }
    }
    if (foundReaction.name === 'Créer un cerle dans un board') {
        try {
            await AddingShapeInBoard(params, user);
        } catch (error) {
            console.error("Erreur lors de l'ajout du post-it dans le board Miro:", error.message);
            throw error;
        }
    }
    if (foundReaction.name === 'Créer une frame A4 dans un board') {
        try {
            await AddingFrameA4InBoard(params, user);
        } catch (error) {
            console.error("Erreur lors de l'ajout de la frame A4 dans le board Miro:", error.message);
            throw error;
        }
    }
};

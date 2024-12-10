import express from "express";
import axios from "axios";
import User from "../models/User.js";
import Services from "../models/Services.js";
import subscriptions from "../models/Subscriptions.js";
import Area from "../models/ARea.js";
import Github from "../models/Github.js";
import {authenticateToken} from "../middlewares/Authentification.js";

const createRepository = async (params, githubAccount) => {
    const { name_repo, description_repo, privacy } = params;

    if (!name_repo || !description_repo || typeof privacy === 'undefined') {
        throw new Error('Veuillez remplir tous les champs requis');
    }
    const privacy_bool = privacy === 'true' || privacy === true ? true :
        privacy === 'false' || privacy === false ? false : false;

    const config = {
        headers: {
            Authorization: `token ${githubAccount.accessToken}`,
            'Content-Type': 'application/json',
        },
    };
    const data = {
        name: name_repo,
        description: description_repo,
        private: privacy_bool,
    };
    try {
        const response = await axios.post('https://api.github.com/user/repos', data, config);
        return response.data;
    } catch (error) {
        if (error.response && error.response.data && error.response.data.errors) {
            const githubErrors = error.response.data.errors;
            for (const err of githubErrors) {
                if (err.resource === 'Repository' && err.field === 'name' && err.code === 'custom') {
                    console.error("Erreur : Le dépôt existe déjà.");
                    throw new Error(`Le dépôt "${name_repo}" existe déjà sur ce compte.`);
                }
            }
        }
        console.error("Erreur lors de la création du répertoire GitHub:", error.response?.data || error.message);
        throw new Error('Erreur lors de la création du répertoire GitHub.');
    }
};

const starRepoOnGitHub = async (owner, repo, githubAccount) => {
    const url = `https://api.github.com/user/starred/${owner}/${repo}`;

    const config = {
        headers: {
            Authorization: `token ${githubAccount.accessToken}`,
            'Accept': 'application/vnd.github.v3+json',
        },
    };

    try {
        const response = await axios.put(url, {}, config);
        if (response.status === 204) {
            console.log(`Repo ${repo} has been starred successfully.`);
        } else {
            console.log(`Unexpected response: ${response.status}`);
        }
    } catch (error) {
        console.error('Error starring the repository:', error.response?.data || error.message);
        throw new Error('Erreur lors du starring du répertoire GitHub.');
    }
};

export const ProduceGithubReaction = async (reaction, userId, params) => {
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

    const user = await Github.findOne({ userId });
    if (!user || !user.accessToken) {
        throw new Error('Compte GitHub non trouvé ou accessToken manquant');
    }

    if (foundReaction.name === 'Créer un répertoire') {
        try {
            const { name_repo, description_repo, privacy } = params;

            if (!name_repo || !description_repo || typeof privacy === 'undefined') {
                throw new Error('Veuillez remplir tous les champs requis');
            }
            const privacy_bool = privacy === 'true' || privacy === true ? true : false;
            await createRepository({ name_repo, description_repo, privacy: privacy_bool }, user);
        } catch (error) {
            if (error.message.includes('Le dépôt') && error.message.includes('existe déjà')) {
                console.warn("Attention :", error.message);
            } else {
                console.error("Erreur lors de la création du répertoire GitHub:", error.message);
            }
            throw error;
        }
    }
    if (foundReaction.name === 'Follow un répertoire') {
        try {
            const { owner_repo, name_repo } = params;
            await starRepoOnGitHub(owner_repo, name_repo, user);
        } catch (error) {
            console.error("Erreur lors du starring du répertoire GitHub:", error.message);
            throw error;
        }
    }
};

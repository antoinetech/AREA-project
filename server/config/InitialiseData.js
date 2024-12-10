import mongoose from 'mongoose';
import Services from '../models/Services.js';
import Subscription from "../models/Subscriptions.js";
import Github from "../models/Github.js";
import Microsoft from "../models/Microsoft.js";
import Discord from "../models/Discord.js";
import Twitter from "../models/Twitter.js";
import Spotify from "../models/Spotify.js";
import Twitch from "../models/Twitch.js";
import Miro from "../models/Miro.js";
import ARea from "../models/ARea.js";
import { AutoRenewAccessToken } from "../middlewares/TokenRenew.js";

export const initialiseData = async () => {
    try {
        const size = await Services.countDocuments();
        if (size === 0) {
            const initialiseServices = [
                {
                    name: "Discord",
                    actions: [
                        {
                            name: "Recevoir un message",
                            description: "Détection d'un nouveau message dans un channel discord spécifique",
                            params: ["serverName", "channelName"]
                        }
                    ],
                    reactions: [
                        {
                            name: "Envoyer un message",
                            description: "Envoie un message dans un channel spécifique",
                            params: ["serverName", "channelName", "message"]
                        }
                    ],
                },
                {
                    name: "Outlook",
                    actions: [
                        {
                            name: "Recevoir un mail",
                            description: "Détecte l'arrivée d'un nouvel email",
                            params: []
                        }
                    ],
                    reactions: [
                        {
                            name: "Envoyer un mail",
                            description: "Envoie un email via Outlook",
                            params: ["to", "subject", "body"]
                        }
                    ],
                },
                {
                    name: "Github",
                    actions: [
                        {
                            name: "Détection de nouveaux commits",
                            description: "Détecte l'apparition d'un nouveau commit dans un répertoire",
                            params: ["name_repo", "username"]
                        }
                    ],
                    reactions: [
                        {
                            name: "Follow un répertoire",
                            description: "Possibilité de suivre un répertoire spécifique",
                            params: ["owner_repo", "name_repo"]
                        },
                        {
                            name: "Créer un répertoire",
                            description: "Création d'un nouveau répertoire",
                            params: ["name_repo", "description_repo", "privacy"]
                        }
                    ],
                },
                {
                    name: "Miro",
                    actions: [
                        {
                            name: "Détecter l'ajout d'un item dans un board",
                            description: "Détecte l'apparition de nouveaux items tels que des post it ou autre",
                            params: ["board_name"]
                        }
                    ],
                    reactions: [
                        {
                            name: "Créer un item texte dans un board",
                            description: "Permet d'ajouter du texte dans un board",
                            params: ["board_name", "text"]
                        },
                        {
                            name: "Créer un post-it dans un board",
                            description: "Permet d'ajouter un post it dans un board",
                            params: ["board_name", "content"]
                        },
                        {
                            name: "Créer un cerle dans un board",
                            description: "Permet d'ajouter un cercle dans un board",
                            params: ["board_name", "content"]
                        },
                        {
                            name: "Créer une frame A4 dans un board",
                            description: "Permet d'ajouter une frame au format A4 dans un board",
                            params: ["board_name", "title"]
                        }
                    ],
                },
                {
                    name: "Twitter",
                    actions: [
                    ],
                    reactions: [
                        {
                            name: "Créer un tweet",
                            description: "Permet de poster un tweet",
                            params: ["content"]
                        }
                    ],
                },
                {
                    name: "Spotify",
                    actions: [
                    ],
                    reactions: [
                        {
                            name: "Créer une nouvelle playlist",
                            description: "Permet la création d'une nouvelle playlist",
                            params: ["name", "description", "privacy"]
                        },
                        {
                            name: "Mettre en pause la lecture",
                            description: "Mettre en pause la musique d'un utilisateur s'il est en train d'écouter",
                            params: []
                        }
                    ],
                },
                {
                    name: "Twitch",
                    actions: [
                    ],
                    reactions: [
                        {
                            name: "Mettre à jour la description de l'utilisateur",
                            description: "Ajouter un texte spécifique dans la bio du profil",
                            params: ["description"]
                        }
                    ],
                },
                {
                    name: "Microsoft-Calendar",
                    actions: [
                        {
                            name: "Détection d'un nouvel évènement",
                            description: "Détecte l'ajout d'un nouvel évènement dans le calendrier",
                            params: []
                        }
                    ],
                    reactions: [
                        {
                            name: "Ajouter un événement",
                            description: "Ajoute un nouvel évènement dans le calendrier",
                            params: ["name", "startDate", "endDate", "startHour", "endHour"]
                        }
                    ],
                }
            ];

            await Services.insertMany(initialiseServices);
            await AutoRenewAccessToken();
        }
    } catch (error) {
        console.error("Erreur lors de l'initialisation des ServicesAuthentification à MongoDB", error);
    }
};

export const  resetModel = async() => {
    try {
        await Subscription.deleteMany();
        await ARea.deleteMany();
        await Services.deleteMany();
    } catch (error) {
        console.error('Erreur lors de la réinitialisation du modèle', error);
    }
}
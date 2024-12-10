import axios from "axios";
import Twitter from "../models/Twitter.js";
import Services from "../models/Services.js";
import Subscription from "../models/Subscriptions.js";
import {getServiceIdByName} from "../subscriptionRoutes/SubscriptionManagement.js";
import Area from "../models/ARea.js";
import {deleteAreaByName} from "../ActionReactionSetup/ActionReactionRouteManagement.js";

export async function renewTwitterAccessToken(twitterAccount, userId) {
    try {
        const response = await axios.get("https://api.twitter.com/2/users/me", {
            headers: {
                Authorization: `Bearer ${twitterAccount.accessToken}`,
            },
        });
        console.log("Token Twitter valide.");
        return true;
    } catch (error) {
        if (error.response && error.response.status === 401) {
            console.log("Token Twitter invalide. Suppression du compte et des Areas associées.");

            const twitterService = await getServiceIdByName("Twitter");
            if (!twitterService) {
                console.error("Service Twitter non trouvé, impossible de supprimer les souscriptions et les Areas.");
                return false;
            }

            const areasToDelete = await Area.find({
                userId,
                $or: [
                    { "action.serviceId": twitterService },
                    { "reactions.serviceId": twitterService },
                ],
            });

            if (areasToDelete.length > 0) {
                console.log(`Areas associées à Twitter trouvées, nombre : ${areasToDelete.length}`);

                for (const area of areasToDelete) {
                    console.log(`Suppression de l'Area : ${area.name}`);
                    const deleteResult = await deleteAreaByName(area.name, userId);
                    if (!deleteResult.success) {
                        console.error(`Erreur lors de la suppression de l'Area : ${area.name}`);
                    }
                }
            }

            await Subscription.deleteOne({ userId, serviceId: twitterService });
            console.log(`Souscription Twitter supprimée pour l'utilisateur : ${userId}`);

            await Twitter.deleteOne({ userId });
            console.log(`Compte Twitter supprimé de la base de données pour l'utilisateur : ${userId}`);
        } else {
            console.error("Erreur lors de la vérification du token Twitter:", error.message);
        }
        return false;
    }
}
import express from "express";
import {authenticateToken} from "../../middlewares/Authentification.js";
import passport from "passport";
import jwt from "jsonwebtoken";
import { getRedirectUrl } from "../../middlewares/UrlIdentification.js"
import {getServiceIdByName} from "../../subscriptionRoutes/SubscriptionManagement.js";
import Area from "../../models/ARea.js";
import Miro from "../../models/Miro.js";
import {unsuscribeMiro} from "../../Webhook/miro.js";
import Subscription from "../../models/Subscriptions.js";
import {deleteAreaByName} from "../../ActionReactionSetup/ActionReactionRouteManagement.js";

const router = express.Router();

const allowedRedirectUrls = [
    `${process.env.CLIENT_URL}/github-callback`,
    `http://production-url.com/github-callback`,
    `${process.env.CLIENT_URL}/miro-callback`,
    `${process.env.CLIENT_URL}/discord-callback`,
    `${process.env.CLIENT_URL}/microsoft-callback`,
    `${process.env.CLIENT_URL}/spotify-callback`,
    `${process.env.CLIENT_URL}/reddit-callback`,
    `${process.env.CLIENT_URL}/twitch-callback`,
    `${process.env.CLIENT_URL_CALLBACK}`,
    `${process.env.MOBILE_URL_CALLBACK}`,
];

router.get("/miro", authenticateToken, (req, res, next) => {
    const redirectUrl = req.query.redirectUrl;
    if (!redirectUrl || !allowedRedirectUrls.includes(redirectUrl)) {
        return res
            .status(400)
            .json({ message: "Paramètre redirectUrl manquant ou non autorisé." });
    }
    req.session.user = req.user;
    req.session.redirectUrl = redirectUrl;
    const clientID = process.env.MIRO_CLIENT_ID;
    const scopes = "boards:read boards:write";
    const redirectUri =
        `${process.env.SERVER_URL_CALLBACK}/miro/callback`;
    const miroAuthUrl = `https://miro.com/oauth/authorize?response_type=code&client_id=${clientID}&redirect_uri=${encodeURIComponent(
        redirectUri
    )}&scope=${encodeURIComponent(scopes)}`;
    res.redirect(miroAuthUrl);
    next();
});

router.get("/miro/callback", (req, res, next) => {
    const code = req.query.code;
    if (!code) {
        const redirectUrl = req.session.redirectUrl || `${process.env.CLIENT_URL_CALLBACK}`;
        return res.redirect(`${redirectUrl}?error=code_not_provided`);
    }

    passport.authenticate("miro", async (err, miroAccount, info) => {
        if (err || !miroAccount) {
            const redirectUrl = req.session.redirectUrl || `${process.env.CLIENT_URL_CALLBACK}`;
            return res.redirect(`${redirectUrl}?error=authentication_failed`);
        }

        if (!req.session.user) {
            const redirectUrl = req.session.redirectUrl || `${process.env.CLIENT_URL_CALLBACK}`;
            return res.redirect(`${redirectUrl}?error=user_not_authenticated`);
        }

        req.session.miro = {
            token: miroAccount.accessToken,
        };

        const jwtToken = jwt.sign(
            {
                userId: req.session.user._id,
                miroToken: miroAccount.accessToken,
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1h",
            }
        );

        const redirectUrl = req.session.redirectUrl || `${process.env.CLIENT_URL_CALLBACK}`;
        res.redirect(`${redirectUrl}?token=${jwtToken}`);
    })(req, res, next);
});

router.delete("/logout-miro", authenticateToken, async (req, res) => {
    const userId = req.user._id ? req.user._id.toString() : req.user.id;

    try {
        if (req.session.miro) {
            req.logout((err) => {
                if (err) {
                    return res.status(500).json({ message: "Erreur lors de la déconnexion." });
                }
                delete req.session.miro;
                req.session.save((err) => {
                    if (err) {
                        return res.status(400).send("Impossible de se déconnecter");
                    }
                    res.clearCookie("connect.sid");
                    console.log(`Session Miro déconnectée pour l'utilisateur ${userId}`);
                });
            });
        }

        const miroService = await getServiceIdByName('Miro');
        if (!miroService) {
            return res.status(404).json({ success: false, message: 'Service Miro non trouvé' });
        }

        const areasToDelete = await Area.find({
            userId,
            $or: [
                { 'action.serviceId': miroService },
                { 'reactions.serviceId': miroService }
            ]
        });

        if (areasToDelete.length > 0) {
            console.log(`Areas associées à Miro trouvées, nombre : ${areasToDelete.length}`);

            for (const area of areasToDelete) {
                console.log(`Suppression de l'Area : ${area.name}`);
                const deleteResult = await deleteAreaByName(area.name, userId);
                if (!deleteResult.success) {
                    return res.status(500).json({ success: false, message: deleteResult.message });
                }
            }
        }

        await Subscription.deleteOne({ userId, serviceId: miroService });
        console.log(`Souscription Miro supprimée pour l'utilisateur : ${userId}`);
        await Miro.deleteOne({ userId });
        console.log(`Compte Miro supprimé de la base de données pour l'utilisateur : ${userId}`);

        return res.status(200).json({ success: true, message: 'Déconnexion et suppression des souscriptions et Areas associées à Miro réussies' });
    } catch (error) {
        console.error('Erreur lors de la déconnexion et de la suppression des données associées à Miro:', error);
        return res.status(500).json({ success: false, message: "Erreur interne du serveur" });
    }
});

export default router;
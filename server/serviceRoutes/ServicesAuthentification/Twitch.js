import express from "express";
import {authenticateToken} from "../../middlewares/Authentification.js";
import axios from "axios";
import Twitch from "../../models/Twitch.js";
import jwt from "jsonwebtoken";
import { getRedirectUrl } from "../../middlewares/UrlIdentification.js"
import Subscription from "../../models/Subscriptions.js";
import {deleteAreaByName} from "../../ActionReactionSetup/ActionReactionRouteManagement.js";
import {getServiceIdByName} from "../../subscriptionRoutes/SubscriptionManagement.js";
import Area from "../../models/ARea.js";

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

router.get("/twitch", authenticateToken, (req, res, next) => {
    const redirectUrl = req.query.redirectUrl;

    if (!redirectUrl || !allowedRedirectUrls.includes(redirectUrl)) {
        return res
            .status(400)
            .json({ message: "Paramètre redirectUrl manquant ou non autorisé." });
    }

    const userId = req.user._id ? req.user._id.toString() : req.user.id;
    if (!userId) {
        return res.status(400).json({ message: "ID utilisateur manquant." });
    }

    req.session.user = { ...req.user, _id: userId.toString() };
    req.session.redirectUrl = redirectUrl;

    req.session.save((err) => {
        if (err) {
            console.error("Erreur lors de la sauvegarde de la session :", err);
            return res
                .status(500)
                .json({ message: "Erreur de sauvegarde de session." });
        }

        const clientID = process.env.TWITCH_CLIENT_ID;
        const redirectUri =
            `${process.env.SERVER_URL_CALLBACK}/twitch/callback`;
        const scopes = "user:read:email user:edit:follows user:edit";
        const state = "your_unique_state";

        const twitchAuthUrl = `https://id.twitch.tv/oauth2/authorize?client_id=${clientID}&response_type=code&redirect_uri=${encodeURIComponent(
            redirectUri
        )}&scope=${encodeURIComponent(scopes)}&state=${state}`;
        res.redirect(twitchAuthUrl);
    });
});

router.get("/twitch/callback", async (req, res, next) => {
    const code = req.query.code;
    if (!code) {
        const redirectUrl = req.session.redirectUrl || `${process.env.CLIENT_URL_CALLBACK}`;
        return res.redirect(`${redirectUrl}?error=code_not_provided`);
    }

    if (!req.session.user || !req.session.user._id) {
        const redirectUrl = req.session.redirectUrl || `${process.env.CLIENT_URL_CALLBACK}`;
        return res.redirect(`${redirectUrl}?error=user_not_authenticated`);
    }

    const userId = req.session.user._id
        ? req.session.user._id.toString()
        : req.session.user.id;
    if (!userId) {
        const redirectUrl = req.session.redirectUrl || `${process.env.CLIENT_URL_CALLBACK}`;
        return res.redirect(`${redirectUrl}?error=user_not_authenticated`);
    }

    try {
        const tokenResponse = await axios.post(
            "https://id.twitch.tv/oauth2/token",
            new URLSearchParams({
                client_id: process.env.TWITCH_CLIENT_ID,
                client_secret: process.env.TWITCH_SECRET,
                code: code,
                grant_type: "authorization_code",
                redirect_uri:
                    `${process.env.SERVER_URL_CALLBACK}/twitch/callback`,
            }),
            {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            }
        );

        const { access_token, refresh_token, expires_in } = tokenResponse.data;

        const profileResponse = await axios.get(
            "https://api.twitch.tv/helix/users",
            {
                headers: {
                    Authorization: `Bearer ${access_token}`,
                    "Client-Id": process.env.TWITCH_CLIENT_ID,
                },
            }
        );

        const profile = profileResponse.data.data[0];

        if (!profile || !profile.id || !profile.display_name || !profile.email) {
            const redirectUrl = req.session.redirectUrl || `${process.env.CLIENT_URL_CALLBACK}`;
            return res.redirect(`${redirectUrl}?error=incomplete_profile`);
        }

        let twitchAccount = await Twitch.findOne({ userId: userId });

        if (twitchAccount) {
            twitchAccount.twitchId = profile.id;
            twitchAccount.displayName = profile.display_name;
            twitchAccount.email = profile.email;
            twitchAccount.avatarUrl = profile.profile_image_url || "";
            twitchAccount.accessToken = access_token;
            twitchAccount.refreshToken = refresh_token || twitchAccount.refreshToken;
            twitchAccount.tokenExpiration = Date.now() + expires_in * 1000;
            await twitchAccount.save();
        } else {
            twitchAccount = new Twitch({
                userId: userId,
                twitchId: profile.id,
                displayName: profile.display_name,
                email: profile.email,
                avatarUrl: profile.profile_image_url || "",
                accessToken: access_token,
                refreshToken: refresh_token,
                tokenExpiration: Date.now() + expires_in * 1000,
            });
            await twitchAccount.save();
        }

        const jwtToken = jwt.sign(
            {
                userId: userId,
                twitchToken: access_token,
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1h",
            }
        );

        const redirectUrl = req.session.redirectUrl || `${process.env.CLIENT_URL_CALLBACK}`;
        res.redirect(`${redirectUrl}?token=${jwtToken}`);
    } catch (err) {
        const redirectUrl = req.session.redirectUrl || `${process.env.CLIENT_URL_CALLBACK}`;
        res.redirect(`${redirectUrl}?error=authentication_failed`);
    }
});

router.delete("/logout-twitch", authenticateToken, async (req, res) => {
    const userId = req.user._id ? req.user._id.toString() : req.user.id;

    try {
        if (req.session.twitch) {
            req.logout((err) => {
                if (err) {
                    return res.status(500).json({ message: "Erreur lors de la déconnexion." });
                }
                delete req.session.twitch;
                req.session.save((err) => {
                    if (err) {
                        return res.status(400).send("Impossible de se déconnecter");
                    }
                    res.clearCookie("connect.sid");
                    console.log(`Session Twitch déconnectée pour l'utilisateur ${userId}`);
                });
            });
        }

        const twitchService = await getServiceIdByName('Twitch');
        if (!twitchService) {
            return res.status(404).json({ success: false, message: 'Service Twitch non trouvé' });
        }

        const areasToDelete = await Area.find({
            userId,
            $or: [
                { 'action.serviceId': twitchService },
                { 'reactions.serviceId': twitchService }
            ]
        });

        if (areasToDelete.length > 0) {
            console.log(`Areas associées à Twitch trouvées, nombre : ${areasToDelete.length}`);

            for (const area of areasToDelete) {
                console.log(`Suppression de l'Area : ${area.name}`);
                const deleteResult = await deleteAreaByName(area.name, userId);
                if (!deleteResult.success) {
                    return res.status(500).json({ success: false, message: deleteResult.message });
                }
            }
        }

        await Subscription.deleteOne({ userId, serviceId: twitchService });
        console.log(`Souscription Twitch supprimée pour l'utilisateur : ${userId}`);

        await Twitch.deleteOne({ userId });
        console.log(`Compte Twitch supprimé de la base de données pour l'utilisateur : ${userId}`);

        return res.status(200).json({ success: true, message: 'Déconnexion et suppression des souscriptions et Areas associées à Twitch réussies' });
    } catch (error) {
        console.error('Erreur lors de la déconnexion et de la suppression des données associées à Twitch:', error);
        return res.status(500).json({ success: false, message: "Erreur interne du serveur" });
    }
});

export default router;
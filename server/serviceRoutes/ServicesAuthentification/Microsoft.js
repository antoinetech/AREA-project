import express from "express";
import {authenticateToken} from "../../middlewares/Authentification.js";
import axios from "axios";
import Microsoft from "../../models/Microsoft.js";
import jwt from "jsonwebtoken";
import { getRedirectUrl } from "../../middlewares/UrlIdentification.js"
import {unsubscribeOutlookWebhook} from "../../Webhook/outlook.js";
import Subscription from "../../models/Subscriptions.js";
import {getServiceIdByName} from "../../subscriptionRoutes/SubscriptionManagement.js";
import Area from "../../models/ARea.js";
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

router.get("/microsoft", authenticateToken, (req, res) => {
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
            return res
                .status(500)
                .json({ message: "Erreur de sauvegarde de session." });
        }

        const clientID = process.env.MICROSOFT_CLIENT_ID;
        const redirectUri =
            `${process.env.SERVER_URL_CALLBACK}/microsoft/callback`;
        const scopes =
            "openid profile offline_access email User.Read User.ReadBasic.All User.ReadWrite Mail.Read Mail.Read.Shared Mail.ReadBasic Mail.ReadBasic.Shared Mail.ReadWrite Mail.ReadWrite.Shared Mail.Send Mail.Send.Shared Calendars.Read Calendars.ReadWrite Chat.Create Chat.Read Chat.ReadBasic Chat.ReadWrite ChatMessage.Read ChatMessage.Send";
        const microsoftAuthUrl = `https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize?client_id=${clientID}&response_type=code&redirect_uri=${encodeURIComponent(
            redirectUri
        )}&response_mode=query&scope=${encodeURIComponent(scopes)}`;

        res.redirect(microsoftAuthUrl);
    });
});

router.get("/microsoft/callback", async (req, res, next) => {
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
        const response = await axios.post(
            "https://login.microsoftonline.com/consumers/oauth2/v2.0/token",
            new URLSearchParams({
                client_id: process.env.MICROSOFT_CLIENT_ID,
                client_secret: process.env.MICROSOFT_SECRET,
                grant_type: "authorization_code",
                code: code,
                redirect_uri:
                    `${process.env.SERVER_URL_CALLBACK}/microsoft/callback`,
            }),
            {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            }
        );

        const { access_token, refresh_token, id_token } = response.data;

        const userResponse = await axios.get(
            "https://graph.microsoft.com/v1.0/me",
            {
                headers: {
                    Authorization: `Bearer ${access_token}`,
                },
            }
        );

        const profile = userResponse.data;

        let microsoftAccount = await Microsoft.findOne({
            userId: req.session.user._id,
        });

        if (microsoftAccount) {
            microsoftAccount.microsoftId = profile.id;
            microsoftAccount.displayName = profile.displayName;
            microsoftAccount.email =
                profile.mail || profile.userPrincipalName || microsoftAccount.email;
            microsoftAccount.accessToken = access_token;
            microsoftAccount.refreshToken =
                refresh_token || microsoftAccount.refreshToken;
            await microsoftAccount.save();
        } else {
            microsoftAccount = new Microsoft({
                userId: req.session.user._id,
                microsoftId: profile.id,
                displayName: profile.displayName,
                email: profile.mail || profile.userPrincipalName || "",
                accessToken: access_token,
                refreshToken: refresh_token,
            });
            await microsoftAccount.save();
        }

        const jwtToken = jwt.sign(
            {
                userId: req.session.user._id,
                microsoftToken: access_token,
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

router.delete("/logout-microsoft", authenticateToken, async (req, res) => {
    const userId = req.user._id ? req.user._id.toString() : req.user.id;

    try {
        if (req.session.microsoft) {
            req.logout((err) => {
                if (err) {
                    return res.status(500).json({ message: "Erreur lors de la déconnexion." });
                }
                delete req.session.microsoft;
                req.session.save((err) => {
                    if (err) {
                        return res.status(400).send("Impossible de se déconnecter");
                    }
                    res.clearCookie("connect.sid");
                    console.log(`Session Microsoft déconnectée pour l'utilisateur ${userId}`);
                });
            });
        }

        const outlookServiceId = await getServiceIdByName('Outlook');
        const calendarServiceId = await getServiceIdByName('Microsoft-Calendar');

        const outlookAreas = await Area.find({
            userId,
            $or: [
                { 'action.serviceId': outlookServiceId },
                { 'reactions.serviceId': outlookServiceId }
            ]
        });

        if (outlookAreas.length > 0) {
            console.log(`Areas associées à Outlook trouvées, nombre : ${outlookAreas.length}`);

            for (const area of outlookAreas) {
                console.log(`Suppression de l'Area : ${area.name}`);
                const deleteResult = await deleteAreaByName(area.name, userId);
                if (!deleteResult.success) {
                    return res.status(500).json({ success: false, message: deleteResult.message });
                }
            }
        }

        const calendarAreas = await Area.find({
            userId,
            $or: [
                { 'action.serviceId': calendarServiceId },
                { 'reactions.serviceId': calendarServiceId }
            ]
        });

        if (calendarAreas.length > 0) {
            console.log(`Areas associées à Microsoft-Calendar trouvées, nombre : ${calendarAreas.length}`);

            for (const area of calendarAreas) {
                console.log(`Suppression de l'Area : ${area.name}`);
                const deleteResult = await deleteAreaByName(area.name, userId);
                if (!deleteResult.success) {
                    return res.status(500).json({ success: false, message: deleteResult.message });
                }
            }
        }

        await Subscription.deleteOne({ userId, serviceId: outlookServiceId });
        console.log(`Souscription Outlook supprimée pour l'utilisateur : ${userId}`);

        await Subscription.deleteOne({ userId, serviceId: calendarServiceId });
        console.log(`Souscription Microsoft-Calendar supprimée pour l'utilisateur : ${userId}`);

        await Microsoft.deleteOne({ userId });
        console.log(`Compte Microsoft supprimé de la base de données pour l'utilisateur : ${userId}`);

        return res.status(200).json({ success: true, message: 'Déconnexion et suppression des souscriptions et Areas associées à Microsoft réussies' });
    } catch (error) {
        console.error('Erreur lors de la déconnexion et de la suppression des données associées à Microsoft:', error);
        return res.status(500).json({ success: false, message: "Erreur interne du serveur" });
    }
});



export default router;
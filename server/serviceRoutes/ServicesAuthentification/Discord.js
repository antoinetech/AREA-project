import express from "express";
import {authenticateToken} from "../../middlewares/Authentification.js";
import axios from "axios";
import Discord from "../../models/Discord.js";
import jwt from "jsonwebtoken";
import { getRedirectUrl } from "../../middlewares/UrlIdentification.js"
import Subscription from "../../models/Subscriptions.js";
import {unsubscribeDiscord} from "../../Webhook/discord.js";
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

router.get("/discord", authenticateToken, (req, res) => {
    const redirectUrl = req.query.redirectUrl;

    if (!redirectUrl || !allowedRedirectUrls.includes(redirectUrl)) {
        return res
            .status(400)
            .json({ message: "Paramètre redirectUrl manquant ou non autorisé." });
    }

    req.session.user = req.user;
    req.session.redirectUrl = redirectUrl;

    const clientID = process.env.DISCORD_CLIENT_ID;
    const redirectUri =
        `${process.env.SERVER_URL_CALLBACK}/discord/callback`;
    const scopes = "identify email guilds bot applications.commands messages.read";
    const discordAuthUrl = `https://discord.com/api/oauth2/authorize?response_type=code&client_id=${clientID}&redirect_uri=${encodeURIComponent(
        redirectUri
    )}&scope=${encodeURIComponent(scopes)}`;


    res.redirect(discordAuthUrl);
});

router.get("/discord/callback", async (req, res, next) => {
    const code = req.query.code;
    if (!code) {
        const redirectUrl = req.session.redirectUrl || `${process.env.CLIENT_URL_CALLBACK}`;
        return res.redirect(`${redirectUrl}?error=code_not_provided`);
    }

    if (!req.session.user) {
        console.error("Utilisateur non trouvé dans la session.");
        const redirectUrl = req.session.redirectUrl || `${process.env.CLIENT_URL_CALLBACK}`;
        return res.redirect(`${redirectUrl}?error=user_not_authenticated`);
    }

    try {
        const response = await axios.post(
            "https://discord.com/api/oauth2/token",
            new URLSearchParams({
                client_id: process.env.DISCORD_CLIENT_ID,
                client_secret: process.env.DISCORD_SECRET,
                grant_type: "authorization_code",
                code: code,
                redirect_uri:
                    `${process.env.SERVER_URL_CALLBACK}/discord/callback`,
                scope: "identify email guilds",
            }),
            {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            }
        );

        const { access_token, refresh_token } = response.data;

        const userResponse = await axios.get("https://discord.com/api/users/@me", {
            headers: {
                Authorization: `Bearer ${access_token}`,
            },
        });

        const profile = userResponse.data;

        let discordAccount = await Discord.findOne({
            userId: req.session.user._id,
        });

        if (discordAccount) {
            discordAccount.discordId = profile.id;
            discordAccount.username = profile.username;
            discordAccount.discriminator = profile.discriminator;
            discordAccount.email = profile.email || discordAccount.email;
            discordAccount.avatar = profile.avatar;
            discordAccount.accessToken = access_token;
            discordAccount.refreshToken =
                refresh_token || discordAccount.refreshToken;
            await discordAccount.save();
        } else {
            discordAccount = new Discord({
                userId: req.session.user.id,
                discordId: profile.id,
                username: profile.username,
                discriminator: profile.discriminator,
                email: profile.email || "",
                avatar: profile.avatar,
                accessToken: access_token,
                refreshToken: refresh_token,
            });
            await discordAccount.save();
        }

        const jwtToken = jwt.sign(
            {
                userId: req.session.user.id,
                discordToken: access_token,
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1h",
            }
        );

        const redirectUrl = req.session.redirectUrl || `${process.env.CLIENT_URL_CALLBACK}`;
        res.redirect(`${redirectUrl}?token=${jwtToken}`);
    } catch (err) {
        console.error("Erreur lors de la connexion Discord :", err);
        const redirectUrl = req.session.redirectUrl || `${process.env.CLIENT_URL_CALLBACK}`;
        res.redirect(`${redirectUrl}?error=authentication_failed`);
    }
});

router.delete("/logout-discord", authenticateToken, async (req, res) => {
    const userId = req.user._id ? req.user._id.toString() : req.user.id;

    try {
        if (req.session.discord) {
            req.logout((err) => {
                if (err) {
                    return res.status(500).json({ message: "Erreur lors de la déconnexion." });
                }
                delete req.session.discord;
                req.session.save((err) => {
                    if (err) {
                        return res.status(400).send("Impossible de se déconnecter");
                    }
                    res.clearCookie("connect.sid");
                    console.log(`Session Discord déconnectée pour l'utilisateur ${userId}`);
                });
            });
        }

        const discordService = await getServiceIdByName('Discord');
        if (!discordService) {
            return res.status(404).json({ success: false, message: 'Service Discord non trouvé' });
        }

        const areasToDelete = await Area.find({
            userId,
            $or: [
                { 'action.serviceId': discordService },
                { 'reactions.serviceId': discordService }
            ]
        });

        if (areasToDelete.length > 0) {
            console.log(`Areas associées à Discord trouvées, nombre : ${areasToDelete.length}`);

            for (const area of areasToDelete) {
                console.log(`Suppression de l'Area : ${area.name}`);
                const deleteResult = await deleteAreaByName(area.name, userId);
                if (!deleteResult.success) {
                    return res.status(500).json({ success: false, message: deleteResult.message });
                }
            }
        }

        await Subscription.deleteOne({ userId, serviceId: discordService });
        console.log(`Souscription Discord supprimée pour l'utilisateur : ${userId}`);
        await Discord.deleteOne({ userId });
        console.log(`Compte Discord supprimé de la base de données pour l'utilisateur : ${userId}`);

        return res.status(200).json({ success: true, message: 'Déconnexion et suppression des souscriptions et Areas associées à Discord réussies' });
    } catch (error) {
        console.error('Erreur lors de la déconnexion et de la suppression des données associées à Discord:', error);
        return res.status(500).json({ success: false, message: "Erreur interne du serveur" });
    }
});


export default router;
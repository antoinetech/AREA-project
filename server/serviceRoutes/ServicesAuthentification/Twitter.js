import express from "express";
import {authenticateToken} from "../../middlewares/Authentification.js";
import axios from "axios";
import Twitter from "../../models/Twitter.js";
import jwt from "jsonwebtoken";
import { getRedirectUrl } from "../../middlewares/UrlIdentification.js"
import crypto from "crypto";
import { Buffer } from 'buffer';
import Subscription from "../../models/Subscriptions.js";
import {deleteAreaByName} from "../../ActionReactionSetup/ActionReactionRouteManagement.js";
import {getServiceIdByName} from "../../subscriptionRoutes/SubscriptionManagement.js";

function generatePKCE() {
    const codeVerifier = crypto.randomBytes(32).toString("hex");
    const codeChallenge = crypto
        .createHash("sha256")
        .update(codeVerifier)
        .digest("base64")
        .replace(/=/g, "")
        .replace(/\+/g, "-")
        .replace(/\//g, "_");
    return { codeVerifier, codeChallenge };
}


const router = express.Router();

const allowedRedirectUrls = [
    `${process.env.CLIENT_URL}/github-callback`,
    `http://production-url.com/github-callback`,
    `${process.env.CLIENT_URL}/miro-callback`,
    `${process.env.CLIENT_URL}/discord-callback`,
    `${process.env.CLIENT_URL}/microsoft-callback`,
    `${process.env.CLIENT_URL}/spotify-callback`,
    `${process.env.CLIENT_URL}/twitter-callback`,
    `${process.env.CLIENT_URL}/twitch-callback`,
    `${process.env.CLIENT_URL_CALLBACK}`,
    `${process.env.MOBILE_URL_CALLBACK}`,
];

router.get("/twitter", authenticateToken, (req, res) => {
    const redirectUrl = req.query.redirectUrl;

    if (!redirectUrl || !allowedRedirectUrls.includes(redirectUrl)) {
        console.log("Paramètre redirectUrl manquant ou non autorisé.");
        return res.status(400).json({ message: "Paramètre redirectUrl manquant ou non autorisé." });
    }

    const userId = req.user._id ? req.user._id.toString() : req.user.id;
    if (!userId) {
        console.log("ID utilisateur manquant.");
        return res.status(400).json({ message: "ID utilisateur manquant." });
    }

    req.session.user = { ...req.user, _id: userId.toString() };
    req.session.redirectUrl = redirectUrl;

    const { codeVerifier, codeChallenge } = generatePKCE();
    req.session.codeVerifier = codeVerifier;

    const twitterAuthUrl = `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${process.env.TWITTER_CLIENT_ID}&redirect_uri=${encodeURIComponent(
        `${process.env.SERVER_URL_CALLBACK}/twitter/callback`
    )}&scope=${encodeURIComponent("tweet.read tweet.write users.read")}&state=state_token&code_challenge=${codeChallenge}&code_challenge_method=S256`;

    console.log("Redirection vers Twitter pour l'authentification.");
    res.redirect(twitterAuthUrl);
});

router.get("/twitter/callback", async (req, res) => {
    const code = req.query.code;
    if (!code) {
        console.log("Code non fourni par Twitter.");
        const redirectUrl = req.session.redirectUrl || `${process.env.CLIENT_URL_CALLBACK}`;
        return res.redirect(`${redirectUrl}?error=code_not_provided`);
    }

    if (!req.session.user || !req.session.user._id) {
        console.log("Utilisateur non authentifié.");
        const redirectUrl = req.session.redirectUrl || `${process.env.CLIENT_URL_CALLBACK}`;
        return res.redirect(`${redirectUrl}?error=user_not_authenticated`);
    }

    const userId = req.session.user._id;
    const codeVerifier = req.session.codeVerifier;

    try {
        const credentials = Buffer.from(`${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_SECRET}`).toString('base64');

        console.log("Envoi de la requête d'échange de code pour le token Twitter...");
        const tokenResponse = await axios.post(
            "https://api.twitter.com/2/oauth2/token",
            new URLSearchParams({
                grant_type: "authorization_code",
                code: code,
                redirect_uri: `${process.env.SERVER_URL_CALLBACK}/twitter/callback`,
                client_id: process.env.TWITTER_CLIENT_ID,
                code_verifier: codeVerifier,
            }),
            {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    Authorization: `Basic ${credentials}`,
                },
            }
        );

        const { access_token, refresh_token, expires_in } = tokenResponse.data;
        console.log("Token Twitter obtenu :", { access_token, refresh_token, expires_in });

        const profileResponse = await axios.get("https://api.twitter.com/2/users/me", {
            headers: {
                Authorization: `Bearer ${access_token}`,
            },
        });

        const profile = profileResponse.data;
        console.log("Profil utilisateur Twitter récupéré :", profile);

        let twitterAccount = await Twitter.findOne({ userId: userId });
        if (twitterAccount) {
            twitterAccount.twitterId = profile.data.id;
            twitterAccount.username = profile.data.username;
            twitterAccount.avatar = profile.data.profile_image_url || "";
            twitterAccount.accessToken = access_token;
            twitterAccount.refreshToken = refresh_token || twitterAccount.refreshToken;
            twitterAccount.tokenExpiration = Date.now() + expires_in * 1000;
            await twitterAccount.save();
            console.log("Compte Twitter mis à jour avec succès.");
        } else {
            twitterAccount = new Twitter({
                userId: userId,
                twitterId: profile.data.id,
                username: profile.data.username,
                avatar: profile.data.profile_image_url || "",
                accessToken: access_token,
                refreshToken: refresh_token,
                tokenExpiration: Date.now() + expires_in * 1000,
            });
            await twitterAccount.save();
            console.log("Nouveau compte Twitter créé et sauvegardé.");
        }

        const jwtToken = jwt.sign(
            {
                userId: userId,
                twitterToken: access_token,
            },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );

        const redirectUrl = req.session.redirectUrl || `${process.env.CLIENT_URL_CALLBACK}`;
        console.log("Authentification réussie, redirection avec le token JWT.");
        res.redirect(`${redirectUrl}?token=${jwtToken}`);
    } catch (err) {
        console.error("Erreur lors de la connexion Twitter :", err.response?.data || err.message);
        const redirectUrl = req.session.redirectUrl || `${process.env.CLIENT_URL_CALLBACK}`;
        res.redirect(`${redirectUrl}?error=authentication_failed`);
    }
});


router.delete("/logout-twitter", authenticateToken, async (req, res) => {
    const userId = req.user._id ? req.user._id.toString() : req.user.id;

    try {
        if (req.session.twitter) {
            req.logout((err) => {
                if (err) {
                    return res.status(500).json({ message: "Erreur lors de la déconnexion." });
                }
                delete req.session.twitter;
                req.session.save((err) => {
                    if (err) {
                        return res.status(400).send("Impossible de se déconnecter");
                    }
                    res.clearCookie("connect.sid");
                    console.log(`Session Twitter déconnectée pour l'utilisateur ${userId}`);
                });
            });
        }

        const twitterService = await getServiceIdByName('Twitter');
        if (!twitterService) {
            return res.status(404).json({ success: false, message: 'Service Twitter non trouvé' });
        }

        const areasToDelete = await Area.find({
            userId,
            $or: [
                { 'action.serviceId': twitterService },
                { 'reactions.serviceId': twitterService }
            ]
        });

        if (areasToDelete.length > 0) {
            console.log(`Areas associées à Twitter trouvées, nombre : ${areasToDelete.length}`);

            for (const area of areasToDelete) {
                console.log(`Suppression de l'Area : ${area.name}`);
                const deleteResult = await deleteAreaByName(area.name, userId);
                if (!deleteResult.success) {
                    return res.status(500).json({ success: false, message: deleteResult.message });
                }
            }
        }

        await Subscription.deleteOne({ userId, serviceId: twitterService });
        console.log(`Souscription Twitter supprimée pour l'utilisateur : ${userId}`);

        await Twitter.deleteOne({ userId });
        console.log(`Compte Twitter supprimé de la base de données pour l'utilisateur : ${userId}`);

        return res.status(200).json({ success: true, message: 'Déconnexion et suppression des souscriptions et Areas associées à Twitter réussies' });
    } catch (error) {
        console.error('Erreur lors de la déconnexion et de la suppression des données associées à Twitter:', error);
        return res.status(500).json({ success: false, message: "Erreur interne du serveur" });
    }
});


export default router;
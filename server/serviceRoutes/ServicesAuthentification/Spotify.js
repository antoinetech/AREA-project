import express from "express";
import {authenticateToken} from "../../middlewares/Authentification.js";
import axios from "axios";
import Spotify from "../../models/Spotify.js";
import jwt from "jsonwebtoken";
import { getRedirectUrl } from "../../middlewares/UrlIdentification.js"
import {getServiceIdByName} from "../../subscriptionRoutes/SubscriptionManagement.js";
import Area from "../../models/ARea.js";
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

router.get("/spotify", authenticateToken, (req, res, next) => {
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

        const clientID = process.env.SPOTIFY_CLIENT_ID;
        const redirectUri =
            `${process.env.SERVER_URL_CALLBACK}/spotify/callback`;
        const scopes =
            "user-read-private user-read-email user-library-read user-library-modify playlist-read-private playlist-read-collaborative playlist-modify-public playlist-modify-private user-follow-read user-follow-modify user-read-playback-state user-modify-playback-state user-read-currently-playing user-read-recently-played user-top-read streaming app-remote-control ugc-image-upload";
        const showDialog = true;
        const spotifyAuthUrl = `https://accounts.spotify.com/authorize?client_id=${clientID}&response_type=code&redirect_uri=${encodeURIComponent(
            redirectUri
        )}&scope=${encodeURIComponent(scopes)}&show_dialog=${showDialog}`;

        res.redirect(spotifyAuthUrl);
    });
});

router.get("/spotify/callback", async (req, res, next) => {
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
            "https://accounts.spotify.com/api/token",
            new URLSearchParams({
                grant_type: "authorization_code",
                code: code,
                redirect_uri:
                    `${process.env.SERVER_URL_CALLBACK}/spotify/callback`,
                client_id: process.env.SPOTIFY_CLIENT_ID,
                client_secret: process.env.SPOTIFY_SECRET,
            }),
            {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            }
        );

        const { access_token, refresh_token, expires_in } = tokenResponse.data;

        const profileResponse = await axios.get("https://api.spotify.com/v1/me", {
            headers: {
                Authorization: `Bearer ${access_token}`,
            },
        });

        const profile = profileResponse.data;

        let spotifyAccount = await Spotify.findOne({ userId: userId });

        if (spotifyAccount) {
            spotifyAccount.spotifyId = profile.id;
            spotifyAccount.displayName = profile.display_name;
            spotifyAccount.email = profile.email;
            spotifyAccount.accessToken = access_token;
            spotifyAccount.refreshToken =
                refresh_token || spotifyAccount.refreshToken;
            spotifyAccount.tokenExpiration = Date.now() + expires_in * 1000;
            await spotifyAccount.save();
        } else {
            spotifyAccount = new Spotify({
                userId: userId,
                spotifyId: profile.id,
                displayName: profile.display_name,
                email: profile.email,
                accessToken: access_token,
                refreshToken: refresh_token,
                tokenExpiration: Date.now() + expires_in * 1000,
            });
            await spotifyAccount.save();
        }

        const jwtToken = jwt.sign(
            {
                userId: userId,
                spotifyToken: access_token,
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

router.delete("/logout-spotify", authenticateToken, async (req, res) => {
    const userId = req.user._id ? req.user._id.toString() : req.user.id;

    try {
        if (req.session.spotify) {
            req.logout((err) => {
                if (err) {
                    return res.status(500).json({ message: "Erreur lors de la déconnexion." });
                }
                delete req.session.spotify;
                req.session.save((err) => {
                    if (err) {
                        return res.status(400).send("Impossible de se déconnecter");
                    }
                    res.clearCookie("connect.sid");
                    console.log(`Session Spotify déconnectée pour l'utilisateur ${userId}`); // Debug log
                });
            });
        }

        const spotifyService = await getServiceIdByName('Spotify');
        if (!spotifyService) {
            return res.status(404).json({ success: false, message: 'Service Spotify non trouvé' });
        }
        const areasToDelete = await Area.find({
            userId,
            $or: [
                { 'action.serviceId': spotifyService },
                { 'reactions.serviceId': spotifyService }
            ]
        });

        if (areasToDelete.length > 0) {
            console.log(`Areas associées à Spotify trouvées, nombre : ${areasToDelete.length}`);

            for (const area of areasToDelete) {
                console.log(`Suppression de l'Area : ${area.name}`);
                const deleteResult = await deleteAreaByName(area.name, userId);
                if (!deleteResult.success) {
                    return res.status(500).json({ success: false, message: deleteResult.message });
                }
            }
        }

        await Subscription.deleteOne({ userId, serviceId: spotifyService });
        console.log(`Souscription Spotify supprimée pour l'utilisateur : ${userId}`);

        await Spotify.deleteOne({ userId });
        console.log(`Compte Spotify supprimé de la base de données pour l'utilisateur : ${userId}`);

        return res.status(200).json({ success: true, message: 'Déconnexion et suppression des souscriptions et Areas associées à Spotify réussies' });
    } catch (error) {
        console.error('Erreur lors de la déconnexion et de la suppression des données associées à Spotify:', error);
        return res.status(500).json({ success: false, message: "Erreur interne du serveur" });
    }
});


export default router;
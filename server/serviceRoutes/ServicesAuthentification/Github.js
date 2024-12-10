import express from "express";
import {authenticateToken} from "../../middlewares/Authentification.js";
import passport from "passport";
import jwt from "jsonwebtoken";
import { getRedirectUrl } from "../../middlewares/UrlIdentification.js"
import {unsubscribeGithubWebhook} from "../../Webhook/github.js";
import {getServiceIdByName} from "../../subscriptionRoutes/SubscriptionManagement.js";
import Area from "../../models/ARea.js";
import Github from "../../models/Github.js";
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

router.get("/github", authenticateToken, (req, res) => {
    console.log('GitHub Auth Request - User:', req.user);
    const redirectUrl = req.query.redirectUrl || `${process.env.CLIENT_URL_CALLBACK}`;
    console.log('Redirect URL:', redirectUrl);
    if (!redirectUrl || !allowedRedirectUrls.includes(redirectUrl)) {
        console.error('Redirect URL manquante ou non autorisée:', redirectUrl);
        return res.status(400).json({
            message: "Paramètre redirectUrl manquant ou non autorisé."
        });
    }
    req.session.user = req.user;
    req.session.redirectUrl = redirectUrl;
    req.session.save((err) => {
        if (err) {
            console.error('Erreur lors de la sauvegarde de la session:', err);
        } else {
            console.log('Session sauvegardée avec succès:', req.session);
            const clientID = process.env.GITHUB_CLIENT_ID;
            const scopes =
                "repo repo:status repo_deployment public_repo repo:invite security_events admin:repo_hook write:repo_hook read:repo_hook admin:org write:org read:org admin:public_key write:public_key read:public_key admin:org_hook gist notifications user read:user user:email user:follow project read:project delete_repo write:packages read:packages delete:packages admin:gpg_key write:gpg_key read:gpg_key codespace workflow";
            const githubAuthUrl = `https://github.com/login/oauth/authorize?response_type=code&redirect_uri=${process.env.SERVER_URL_CALLBACK}/github/callback&scope=${encodeURIComponent(scopes)}&client_id=${clientID}`;
            console.log('Redirection vers GitHub Auth URL:', githubAuthUrl);
            res.redirect(githubAuthUrl);
        }
    });
});

router.get("/github/callback", (req, res, next) => {
    console.log('GitHub Callback - Cookies:', req.cookies);
    console.log('GitHub Callback - Session avant authentification:', req.session);
    if (req.session.user) {
        console.log('Utilisateur trouvé dans la session:', req.session.user);
        req.user = req.session.user;
    }
    if (!req.session.user) {
        console.error('Utilisateur non authentifié dans la session');
        const redirectUrl = req.session.redirectUrl || `${process.env.CLIENT_URL_CALLBACK}`;
        return res.redirect(`${redirectUrl}?error=user_not_authenticated`);
    }
    passport.authenticate("github", (err, githubAccount) => {
        if (err || !githubAccount) {
            console.error('Erreur lors de l\'authentification GitHub ou compte GitHub manquant:', err);
            const redirectUrl = req.session.redirectUrl || `${process.env.CLIENT_URL_CALLBACK}`;
            return res.redirect(`${redirectUrl}?error=authentication_failed`);
        }
        console.log('Authentification GitHub réussie:', githubAccount);
        req.session.github = { token: githubAccount.accessToken };
        req.session.save((err) => {
            if (err) {
                console.error('Erreur lors de la sauvegarde de la session après GitHub:', err);
            } else {
                const jwtToken = jwt.sign({
                    userId: req.session.user._id,
                    githubToken: githubAccount.accessToken,
                }, process.env.JWT_SECRET, { expiresIn: "1h" });
                const redirectUrl = req.session.redirectUrl || `${process.env.CLIENT_URL_CALLBACK}`;
                console.log('Redirection finale avec token JWT:', jwtToken);
                res.redirect(`${redirectUrl}?token=${jwtToken}`);
            }
        });
    })(req, res, next);
});

router.delete("/logout-github", authenticateToken, async (req, res) => {
    const userId = req.user._id ? req.user._id.toString() : req.user.id;

    try {
        if (req.session.github) {
            req.logout((err) => {
                if (err) {
                    return res.status(500).json({ message: "Erreur lors de la déconnexion." });
                }
                delete req.session.github;
                req.session.save((err) => {
                    if (err) {
                        return res.status(400).send("Impossible de se déconnecter");
                    }
                    res.clearCookie("connect.sid");
                    console.log(`Session GitHub déconnectée pour l'utilisateur ${userId}`);
                });
            });
        }

        const githubService = await getServiceIdByName('Github');
        if (!githubService) {
            return res.status(404).json({ success: false, message: 'Service GitHub non trouvé' });
        }

        const areasToDelete = await Area.find({
            userId,
            $or: [
                { 'action.serviceId': githubService },
                { 'reactions.serviceId': githubService }
            ]
        });

        if (areasToDelete.length > 0) {
            console.log(`Areas associées à GitHub trouvées, nombre : ${areasToDelete.length}`);

            for (const area of areasToDelete) {
                console.log(`Suppression de l'Area : ${area.name}`);
                const deleteResult = await deleteAreaByName(area.name, userId);
                if (!deleteResult.success) {
                    return res.status(500).json({ success: false, message: deleteResult.message });
                }
            }
        }

        await Subscription.deleteOne({ userId, serviceId: githubService });
        console.log(`Souscription GitHub supprimée pour l'utilisateur : ${userId}`);
        await Github.deleteOne({ userId });
        console.log(`Compte GitHub supprimé de la base de données pour l'utilisateur : ${userId}`);

        return res.status(200).json({ success: true, message: 'Déconnexion et suppression des souscriptions et Areas associées à GitHub réussies' });
    } catch (error) {
        console.error('Erreur lors de la déconnexion et de la suppression des données associées à GitHub:', error);
        return res.status(500).json({ success: false, message: "Erreur interne du serveur" });
    }
});


export default router;
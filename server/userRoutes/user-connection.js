import express from "express";
import User from '../models/User.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import passport from "passport";
import { authenticateToken } from "../middlewares/Authentification.js";
import axios from 'axios';

const allowedRedirectUrls = [
    `${process.env.CLIENT_URL}/github-callback`,
    `http://production-url.com/github-callback`,
    `${process.env.CLIENT_URL}/miro-callback`,
    `${process.env.CLIENT_URL}/discord-callback`,
    `${process.env.CLIENT_URL}/microsoft-callback`,
    `${process.env.CLIENT_URL}/spotify-callback`,
    `${process.env.CLIENT_URL}/reddit-callback`,
    `${process.env.CLIENT_URL}/twitch-callback`,
    `${process.env.CLIENT_URL}/google-login/callback`,
    `${process.env.CLIENT_URL_CALLBACK}`,
    `${process.env.MOBILE_URL_CALLBACK}`,
    `${process.env.CLIENT_URL}`,
    `${process.env.MOBILE_URL}`,
    "http://localhost:8081/Homepage",
    "http://localhost:8085/homepage",
];

const router = express.Router();


router.post("/login", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Veuillez remplir tous les champs' });
    }

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
        }

        if (user.googleId) {
            return res.status(400).json({ success: false, message: 'Connectez-vous avec Google' });
        }

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return res.status(401).json({ success: false, message: 'Mot de passe incorrect' });
        }

        const jwtToken = jwt.sign(
            {
                id: user._id,
                name: user.name,
                surname: user.surname,
                email: user.email,
                googleId: "",
            },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        req.session.userId = user._id;
        req.session.userEmail = user.email;
        req.session.isAuthenticated = true;

        res.status(200).json({ success: true, token: jwtToken });
    } catch (err) {
        console.error('Server error:', err);
        res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
    }
});

router.post('/register', async (req, res) => {
    try {
        const { name, surname, email, password } = req.body;
        if (!name || !surname || !email || !password) {
            return res.status(400).json({ message: 'Veuillez remplir tous les champs' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ name, surname, email, password: hashedPassword });

        await newUser.save();

        res.status(201).json({success: true, message: 'Utilisateur créé avec succès'});
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.delete('/logout', authenticateToken, (req, res) => {
    if (req.session.google && req.user.googleId) {
        req.logout((err) => {
            if (err) {
                return res.status(500).json({ message: 'Erreur lors de la déconnexion.' });
            }
            req.session.destroy(err => {
                if (err) {
                    return res.status(400).send('Impossible de se déconnecter');
                } else {
                    res.clearCookie('connect.sid');
                    return res.send('Déconnexion réussie');
                }
            });
        });
    } else if (!req.user.googleId) {
        res.status(200).json({message: 'Déconnexion réussie'});
    } else {
        res.status(200).json({message: 'Pas de session à déconnecter'});
    }
});

router.get('/google-login', (req, res) => {
    const isMobile = req.query.isMobile === 'true';
    const redirectUrl = req.query.redirectUrl || process.env.CLIENT_URL_CALLBACK;

    // Enregistre dans la session
    req.session.isMobile = isMobile;
    req.session.redirectUrl = redirectUrl;

    console.log("Log - Google Login Route: isMobile =", isMobile);
    console.log("Log - Google Login Route: redirectUrl =", redirectUrl);

    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.GOOGLE_CLIENT_ID}&redirect_uri=${process.env.SERVER_GOOGLE_CALLBACK}/google-login/callback&response_type=code&scope=profile email`;
    
    res.redirect(googleAuthUrl);
});

router.get('/google-login/callback', async (req, res) => {
    const { code } = req.query;
    console.log("Log - Callback Route: Reçu le code d'autorisation de Google");
    console.log("Log - Authorization Code:", code);

    try {
        // Échange le code d'autorisation contre un token d'accès
        const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_SECRET,
            redirect_uri: `${process.env.SERVER_GOOGLE_CALLBACK}/google-login/callback`,
            grant_type: 'authorization_code',
            code,
        });

        const { access_token } = tokenResponse.data;
        console.log("Log - Callback Route: Token d'accès reçu");

        // Utilise le token d'accès pour obtenir les informations de l'utilisateur
        const userInfoResponse = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${access_token}` },
        });

        const { id, given_name, family_name, email } = userInfoResponse.data;
        console.log("Log - Callback Route: Informations utilisateur reçues");

        // Recherche ou création de l'utilisateur
        let user = await User.findOne({ googleId: id });
        if (!user) {
            console.log("Log - Callback Route: Nouvel utilisateur, création dans la base de données");
            user = new User({ googleId: id, name: given_name, surname: family_name, email });
            await user.save();
        }

        // Crée un JWT pour l'utilisateur
        const jwtToken = jwt.sign({
            id: user._id,
            name: user.name,
            surname: user.surname,
            email: user.email,
            googleId: user.googleId,
        }, process.env.JWT_SECRET, { expiresIn: '1h' });

        console.log("Log - Callback Route: JWT Token généré");

        // Récupère `isMobile` et `redirectUrl` depuis la session pour déterminer l'URL de redirection
        const isMobile = req.session.isMobile;
        const finalRedirectUrl = isMobile ? `${process.env.MOBILE_URL_HOMEPAGE}` : req.session.redirectUrl;

        console.log("Log - Callback Route: isMobile =", isMobile);
        console.log("Log - Callback Route: Final Redirect URL =", finalRedirectUrl);

        // Redirige avec le token JWT
        res.redirect(`${finalRedirectUrl}?token=${jwtToken}`);

    } catch (error) {
        console.error("Erreur lors de l'authentification Google:", error);
        res.redirect('/login');
    }
});


router.put("/update-profile", authenticateToken, async (req, res) => {
    const { firstName, lastName, email, currentPassword, newPassword } = req.body;

    try {
        console.log("Received update-profile request:", req.body);

        const userId = req.user._id ? req.user._id.toString() : req.user.id;
        console.log("Updating profile for user ID:", userId);

        let updateFields = {};
        if (firstName) updateFields.name = firstName;
        if (lastName) updateFields.surname = lastName;
        if (email) {
            const existingUser = await User.findOne({ email });
            if (existingUser && existingUser._id.toString() !== userId) {
                return res.status(400).json({ message: "Email already taken" });
            }
            updateFields.email = email;
        }
        const user = await User.findById(userId);
        if (!user) {
            console.log("User not found with ID:", userId);
            return res.status(404).json({ message: "User not found" });
        }

        console.log("User found:", user);

        if (user.googleId && (currentPassword || newPassword)) {
            console.log("Attempt to change password for Google user, returning error.");
            return res.status(400).json({ message: "Password cannot be changed for Google users" });
        }

        if (currentPassword && newPassword) {
            console.log("Password change requested, verifying current password.");
            const isMatch = await bcrypt.compare(currentPassword, user.password);
            if (!isMatch) {
                console.log("Current password does not match.");
                return res.status(400).json({ message: "Incorrect current password" });
            }

            console.log("Current password matches, updating to new password.");
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(newPassword, salt);
            updateFields.password = hashedPassword;
        }

        const updatedUser = await User.findByIdAndUpdate(userId, updateFields, { new: true, runValidators: true });
        console.log("Updated user:", updatedUser);

        res.status(200).json({ message: "Profile updated successfully", user: updatedUser });
    } catch (error) {
        console.error("Error during profile update:", error);
        res.status(500).json({ message: "Server error" });
    }
});

export default router;

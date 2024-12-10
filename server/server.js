
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import session from "express-session";
import cookieParser from 'cookie-parser';
import passport from "passport";
import MongoStore from 'connect-mongo';
import fs from 'fs';
import path from 'path';
import ngrok from 'ngrok';
import userconnection from "./userRoutes/user-connection.js";
import userinformations from "./userRoutes/userInformations.js";
import services from "./serviceRoutes/ServicesInformations.js";
import servicesauthentification from "./serviceRoutes/ServicesAuthentification.js";
import usersubscriptions from "./subscriptionRoutes/SubscriptionManagement.js";
import apiInformations from "./ApiInformations/ApiInformations.js";
import area from "./ActionReactionSetup/ActionReactionRouteManagement.js";
import './oauth2/googleAuthentification.js';
import './oauth2/githubAuthentification.js';
import './oauth2/miroAuthentification.js';
import './oauth2/discordAuthentification.js';
import './oauth2/microsoftAuthentification.js';
import './oauth2/redditAuthentification.js';
import './oauth2/spotifyAuthentification.js';
import './oauth2/twitchAuthentification.js';
import { initialiseData, resetModel } from "./config/InitialiseData.js";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { LinkActionToReaction } from './ActionReactionSetup/ProduceReaction.js'
import OutlookWebhook from './Webhook/OutlookRoutes.js';
import GithubWebhook from './Webhook/GithubRoutes.js';
import DiscordWebhook from "./Webhook/DiscordRoutes.js";
import MiroWebhook from "./Webhook/MiroRoutes.js";
import User from "./models/User.js";
import Microsoft from "./models/Microsoft.js";
import cron from "node-cron";
import {AutoRenewAccessToken} from "./middlewares/TokenRenew.js";
import { authenticateToken } from "./middlewares/Authentification.js";


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const updateEnvFile = (filePath, key, value) => {
    let envFileContent = fs.readFileSync(filePath, 'utf8');
    const regex = new RegExp(`^${key}=.*`, 'm');

    if (regex.test(envFileContent)) {
        envFileContent = envFileContent.replace(regex, `${key}=${value}`);
    } else {
        envFileContent += `\n${key}=${value}`;
    }

    fs.writeFileSync(filePath, envFileContent);
    console.log(`${key} mis à jour dans .env : ${value}`);
};

const envPath = path.join(__dirname, '.env');

const setupNgrok = async () => {
    try {
        await ngrok.authtoken(process.env.NGROK_AUTHTOKEN);
        const url = await ngrok.connect({
            addr: process.env.PORT || 8080,
            onStatusChange: status => console.log('Ngrok status:', status),
            onLogEvent: data => console.log('Ngrok log:', data),
        });

        updateEnvFile(envPath, 'WEBHOOK_URL', url);
        process.env.WEBHOOK_URL = url;
    } catch (err) {
        console.error('Erreur lors de la mise à jour de l\'URL Ngrok:', err);
    }
};

await setupNgrok();

dotenv.config({ path: envPath });

const PORT = process.env.PORT || 8080;
const app = express();

app.use(cors({
    origin: [`${process.env.CLIENT_URL}`, `${process.env.MOBILE_URL}`],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Group-Authorization'],
    credentials: true
}));

app.options('*', cors());

app.use(express.json());
app.use(cookieParser());

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: true,
    saveUninitialized: true,
    store: MongoStore.create({
        mongoUrl: process.env.MONGO_URI,
        collectionName: 'sessions',
        ttl: 60 * 60
    }),
    cookie: {
        secure: false,
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 1000
    }
}));


app.use(passport.initialize());
app.use(passport.session());

const handleExit = async () => {
    console.log('Signal reçu. Fermeture en cours...');

    try {

        await clearSessions();

        await mongoose.connection.close(() => {
            console.log('Connexion MongoDB fermée');
        });

        setTimeout(() => {
            console.log('Fermeture du serveur...');
            process.exit(0);
        }, 1000);
    } catch (err) {
        console.error('Erreur lors de la fermeture :', err);
        process.exit(1);
    }
};

process.on('SIGINT', handleExit);
process.on('SIGTERM', handleExit);

mongoose.connect(process.env.MONGO_URI)
    .then(async () => {
        console.log('Connecté à MongoDB');
        try {
            await resetModel();
            await initialiseData();
            console.log('Initialisation des données terminée');
            console.log('Serveur prêt à recevoir des requêtes', process.env.WEBHOOK_URL);
        } catch (error) {
            console.error('Erreur lors de l\'initialisation des données :', error);
        }
    })
    .catch((err) => console.error('Erreur de connexion à MongoDB :', err));

app.use("/userRoutes/user-connection", userconnection);
app.use("/userRoutes/user-informations", userinformations);
app.use("/serviceRoutes/services-informations", services);
app.use("/subscriptionRoutes/subscription-management", usersubscriptions);
app.use("/", apiInformations);
app.use("/serviceRoutes/services-authentication", servicesauthentification);
app.use("/areaRoutes", area);
app.use("/webhook/outlook", OutlookWebhook);
app.use("/webhook/github", GithubWebhook);
app.use("/webhook/discord", DiscordWebhook);
app.use("/webhook/miro", MiroWebhook);

cron.schedule('0 * * * *', () => {
    AutoRenewAccessToken();
});

app.listen(PORT, () => {
    console.log(`Serveur démarré sur http://localhost:${PORT}`);
    console.log(`WEBHOOK_URL après mise à jour: ${process.env.WEBHOOK_URL}`);
});
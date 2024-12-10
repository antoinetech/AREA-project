import express from "express";
import Services from "../models/Services.js";
import { authenticateToken } from '../middlewares/Authentification.js';
import Microsoft from '../models/Microsoft.js';
import Discord from '../models/Discord.js';
import Spotify from '../models/Spotify.js';
import Twitch from '../models/Twitch.js';
import Twitter from '../models/Twitter.js';
import Github from '../models/Github.js';
import Miro from "../models/Miro.js";

const router = express.Router();

router.get("/services-list", async (req, res) => {
    const user = await Services.find();
    res.status(200).json(user);
});

router.get("/service/:id", async (req, res) => {
    const user = await Services.findById(req.params.id);
    res.status(200).json(user);
});

router.get('/user-accounts', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        const microsoftAccount = await Microsoft.findOne({ userId });
        const discordAccount = await Discord.findOne({ userId });
        const spotifyAccount = await Spotify.findOne({ userId });
        const twitchAccount = await Twitch.findOne({ userId });
        const twitterAccount = await Twitter.findOne({ userId });
        const githubAccount = await Github.findOne({ userId });
        const miroAccount = await Miro.findOne({ userId });


        const accounts = {
            microsoft: microsoftAccount ? true : false,
            discord: discordAccount ? true : false,
            spotify: spotifyAccount ? true : false,
            twitch: twitchAccount ? true : false,
            twitter: redditAccount ? true : false,
            github: githubAccount ? true : false,
            miro: miroAccount ? true : false,
        };

        res.status(200).json(accounts);
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while fetching user accounts' });
    }
});

export default router;

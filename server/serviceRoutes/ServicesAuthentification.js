import express from "express";
import githubRoutes from './ServicesAuthentification/Github.js';
import miroRoutes from './ServicesAuthentification/Miro.js';
import discordRoutes from './ServicesAuthentification/Discord.js';
import microsoftRoutes from './ServicesAuthentification/Microsoft.js';
import spotifyRoutes from './ServicesAuthentification/Spotify.js';
import twitterRoutes from './ServicesAuthentification/Twitter.js';
import twitchRoutes from './ServicesAuthentification/Twitch.js';

const router = express.Router();

router.use(githubRoutes);
router.use(miroRoutes);
router.use(discordRoutes);
router.use(microsoftRoutes);
router.use(spotifyRoutes);
router.use(twitterRoutes);
router.use(twitchRoutes);

export default router;

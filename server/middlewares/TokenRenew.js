import User from "../models/User.js";
import Microsoft from "../models/Microsoft.js";
import Spotify from "../models/Spotify.js";
import Discord from "../models/Discord.js";
import Miro from "../models/Miro.js";
import Twitch from "../models/Twitch.js";
import Twitter from "../models/Twitter.js";
import {renewMicrosoftAccessToken} from "../Webhook/outlook.js";
import {renewSpotifyAccessToken} from "../Webhook/spotify.js";
import {renewDiscordAccessToken} from "../Webhook/discord.js";
import {checkMiroToken} from "../Webhook/miro.js";
import {renewTwitchAccessToken} from "../Webhook/twitch.js";
import {renewTwitterAccessToken} from "../Webhook/twitter.js";

export async function AutoRenewAccessToken() {
    try {
        const users = await User.find();
        for (const user of users) {
            const userID = user._id;
            const microsoft = await Microsoft.findOne({ userId: userID });
            const spotify = await Spotify.findOne({ userId: userID });
            const discord = await Discord.findOne({ userId: userID });
            const miro = await Miro.findOne({ userId: userID });
            const twitch = await Twitch.findOne({ userId: userID });
            const twitter = await Twitter.findOne({ userId : userID });
            if (microsoft) {
                await renewMicrosoftAccessToken(microsoft.refreshToken, userID);
            }
            if (spotify) {
                await renewSpotifyAccessToken(spotify.refreshToken, userID);
            }
            if (discord) {
                await renewDiscordAccessToken(discord.refreshToken, userID);
            }
            if (miro) {
                await checkMiroToken(userID);
            }
            if (twitch) {
                await renewTwitchAccessToken(twitch.refreshToken, userID);
            }
            if (twitter) {
                await renewTwitterAccessToken(twitter, userID);
            }
        }
    } catch (error) {
        console.error('Error renewing tokens:', error);
    }
}

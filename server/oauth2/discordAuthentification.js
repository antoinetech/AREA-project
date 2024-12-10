import passport from 'passport';
import DiscordStrategy from 'passport-discord';
import User from "../models/User.js";
import Discord from "../models/Discord.js";
import axios from 'axios';

passport.use('discord', new DiscordStrategy({
        clientID: process.env.DISCORD_CLIENT_ID,
        clientSecret: process.env.DISCORD_SECRET,
        callbackURL: `${process.env.SERVER_URL_CALLBACK}/discord/callback`,
        scope: [
            'identify',
            'email',
            'guilds',
            'applications.commands',
            'messages.read'
        ],
        passReqToCallback: true
    },
    async (req, accessToken, refreshToken, profile, done) => {
        try {

            const user = req.session.user;
            if (!req.user || !req.user.id) {
                return done(null, false, { message: 'User not authenticated or ID missing' });
            }
            if (!user) {
                return done(null, false, { message: 'User not authenticated' });
            }

            let discordAccount = await Discord.findOne({ userId: user.id });

            if (discordAccount) {
                discordAccount.discordId = profile.id;
                discordAccount.username = profile.username;
                discordAccount.discriminator = profile.discriminator;
                discordAccount.email = profile.email || discordAccount.email;
                discordAccount.avatar = profile.avatar;
                discordAccount.accessToken = accessToken;
                discordAccount.refreshToken = refreshToken || discordAccount.refreshToken;
                await discordAccount.save();
            } else {
                discordAccount = new Discord({
                    userId: user.id,
                    discordId: profile.id,
                    username: profile.username,
                    discriminator: profile.discriminator,
                    email: profile.email || '',
                    avatar: profile.avatar,
                    accessToken: accessToken,
                    refreshToken: refreshToken
                });
                await discordAccount.save();
            }

            return done(null, discordAccount);
        } catch (err) {
            return done(err);
        }
    }
));

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (error) {
        done(error);
    }
});
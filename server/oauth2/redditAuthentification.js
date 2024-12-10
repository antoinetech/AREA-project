import passport from 'passport';
import { Strategy as RedditStrategy } from 'passport-reddit';
import axios from "axios";
import Twitter from "../models/Twitter.js";
import User from "../models/User.js";

passport.use('reddit', new RedditStrategy({
        clientID: process.env.REDDIT_CLIENT_ID,
        clientSecret: process.env.REDDIT_SECRET,
        callbackURL: `${process.env.SERVER_URL_CALLBACK}/reddit/callback`,
        passReqToCallback: true,
        scope: [
            'identity',
            'edit',
            'flair',
            'history',
            'modconfig',
            'modflair',
            'modlog',
            'modposts',
            'modwiki',
            'mysubreddits',
            'privatemessages',
            'read',
            'report',
            'save',
            'submit',
            'subscribe',
            'vote',
            'wikiedit',
            'wikiread'
        ]
    },
    async (req, accessToken, refreshToken, profile, done) => {
        try {
            const user = req.session.user;
            if (!user) {
                return done(null, false, {message: 'User not authenticated'});
            }

            const profileResponse = await axios.get('https://oauth.reddit.com/api/v1/me', {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            });

            const profileData = profileResponse.data;

            let redditAccount = await Twitter.findOne({userId: user._id});
            if (redditAccount) {
                redditAccount.redditId = profileData.id;
                redditAccount.username = profileData.name;
                redditAccount.avatar = profileData.icon_img || '';
                redditAccount.accessToken = accessToken;
                redditAccount.refreshToken = refreshToken || redditAccount.refreshToken;
                await redditAccount.save();
            } else {
                redditAccount = new Twitter({
                    userId: user._id,
                    redditId: profileData.id,
                    username: profileData.name,
                    avatar: profileData.icon_img || '',
                    accessToken: accessToken,
                    refreshToken: refreshToken
                });
                await redditAccount.save();
            }

            return done(null, redditAccount);

        } catch (err) {
            console.error('Erreur lors de la configuration de SpotifyStrategy :', err);
            return done(err);
        }
    }));

passport.serializeUser((user, done) => {
    done(null, user._id.toString());
});



passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (error) {
        done(error);
    }
});


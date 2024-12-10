import passport from 'passport';
import { Strategy as OAuth2Strategy } from 'passport-oauth2';
import User from "../models/User.js";
import axios from "axios";
import Twitch from "../models/Twitch.js";

passport.use('twitch', new OAuth2Strategy({
    authorizationURL: 'https://id.twitch.tv/oauth2/authorize',
    tokenURL: 'https://id.twitch.tv/oauth2/token',
    clientID: process.env.TWITCH_CLIENT_ID,
    clientSecret: process.env.TWITCH_SECRET,
    callbackURL: `${process.env.SERVER_URL_CALLBACK}/twitch/callback`,
    passReqToCallback: true,
    scope: 'user:read:email'
}, async (req, accessToken, refreshToken, params, done) => {
    try {
        const user = req.session.user;
        if (!user) {
            return done(null, false, { message: 'User not authenticated' });
        }

        const profileResponse = await axios.get('https://api.twitch.tv/helix/users', {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Client-Id': process.env.TWITCH_CLIENT_ID
            }
        });

        const profileData = profileResponse.data.data[0];
        if (!profileData || !profileData.id || !profileData.display_name || !profileData.email) {
            return done(null, false, { message: 'Incomplete profile information from Twitch' });
        }

        let twitchAccount = await Twitch.findOne({ userId: user._id });

        if (twitchAccount) {
            twitchAccount.twitchId = profileData.id;
            twitchAccount.displayName = profileData.display_name;
            twitchAccount.email = profileData.email;
            twitchAccount.avatarUrl = profileData.profile_image_url || '';
            twitchAccount.accessToken = accessToken;
            twitchAccount.refreshToken = refreshToken || twitchAccount.refreshToken;
            await twitchAccount.save();
        } else {
            twitchAccount = new Twitch({
                userId: user._id,
                twitchId: profileData.id,
                displayName: profileData.display_name,
                email: profileData.email,
                avatarUrl: profileData.profile_image_url || '',
                accessToken: accessToken,
                refreshToken: refreshToken
            });
            await twitchAccount.save();
        }

        return done(null, twitchAccount);
    } catch (err) {
        console.error('Erreur lors de la configuration de TwitchStrategy :', err);
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

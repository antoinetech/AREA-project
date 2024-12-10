import passport from 'passport';
import { Strategy as MiroStrategy } from 'passport-oauth2';
import Miro from "../models/Miro.js";
import User from "../models/User.js";
import axios from 'axios';


passport.use('miro', new MiroStrategy({
        authorizationURL: 'https://miro.com/oauth/authorize',
        tokenURL: 'https://api.miro.com/v1/oauth/token',
        clientID: process.env.MIRO_CLIENT_ID,
        clientSecret: process.env.MIRO_SECRET,
        callbackURL: `${process.env.SERVER_URL_CALLBACK}/miro/callback`,
        passReqToCallback: true
    },
    async (req, accessToken, refreshToken, params, done) => {
        try {

            const user = req.session.user;
            if (!user) {
                return done(null, false, { message: 'User not authenticated' });
            }

            const response = await axios.get('https://api.miro.com/v1/users/me', {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });
            const profile = response.data;

            const avatarUrl = profile.picture?.imageUrl || '';

            let miroAccount = await Miro.findOne({ userId: user.id });

            if (miroAccount) {

                miroAccount.miroId = profile.id;
                miroAccount.displayName = profile.name;
                miroAccount.email = profile.email;
                miroAccount.avatarUrl = avatarUrl;
                miroAccount.accessToken = accessToken;
                miroAccount.refreshToken = refreshToken || miroAccount.refreshToken;
                await miroAccount.save();
            } else {

                miroAccount = new Miro({
                    userId: user.id,
                    miroId: profile.id,
                    displayName: profile.name,
                    email: profile.email,
                    avatarUrl: avatarUrl,
                    accessToken: accessToken,
                    refreshToken: refreshToken
                });
                await miroAccount.save();
            }

            return done(null, miroAccount);
        } catch (err) {
            console.error('Erreur lors de la récupération du profil Miro:', err);
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
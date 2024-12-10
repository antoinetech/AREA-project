import passport from 'passport';
import { Strategy as OAuth2Strategy } from 'passport-oauth2';
import Microsoft from "../models/Microsoft.js";
import User from "../models/User.js";
import axios from 'axios';

passport.use('microsoft', new OAuth2Strategy({
    authorizationURL: 'https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize',
    tokenURL: 'https://login.microsoftonline.com/consumers/oauth2/v2.0/token',
    clientID: process.env.MICROSOFT_CLIENT_ID,
    clientSecret: process.env.MICROSOFT_SECRET,
    callbackURL: `${process.env.SERVER_URL_CALLBACK}/microsoft/callback`,
    passReqToCallback: true,
    scope: [
        'openid',
        'profile',
        'offline_access',
        'email',
        'User.Read',
        'User.ReadBasic.All',
        'User.ReadWrite',
        'Mail.Read',
        'Mail.Read.Shared',
        'Mail.ReadBasic',
        'Mail.ReadBasic.Shared',
        'Mail.ReadWrite',
        'Mail.ReadWrite.Shared',
        'Mail.Send',
        'Mail.Send.Shared',
        'Calendars.Read',
        'Calendars.ReadWrite',
        'Chat.Create',
        'Chat.Read',
        'Chat.ReadBasic',
        'Chat.ReadWrite',
        'ChatMessage.Read',
        'ChatMessage.Send'
    ]

}, async (req, accessToken, refreshToken, params, done) => {
    try {

        const user = req.session.user;
        if (!user) {
            return done(null, false, { message: 'User not authenticated' });
        }

        const profileResponse = await axios.get('https://graph.microsoft.com/v1.0/me', {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });

        const profile = profileResponse.data;

        let microsoftAccount = await Microsoft.findOne({ userId: user._id });

        if (microsoftAccount) {

            microsoftAccount.microsoftId = profile.id;
            microsoftAccount.email = profile.mail || profile.userPrincipalName || microsoftAccount.email;
            microsoftAccount.displayName = profile.displayName;
            microsoftAccount.accessToken = accessToken;
            microsoftAccount.refreshToken = refreshToken || microsoftAccount.refreshToken;
            await microsoftAccount.save();
        } else {

            microsoftAccount = new Microsoft({
                userId: user._id,
                microsoftId: profile.id,
                email: profile.mail || profile.userPrincipalName,
                displayName: profile.displayName,
                accessToken: accessToken,
                refreshToken: refreshToken
            });
            await microsoftAccount.save();
        }

        return done(null, microsoftAccount);
    } catch (err) {
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






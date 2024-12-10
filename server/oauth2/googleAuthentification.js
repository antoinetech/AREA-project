import passport from 'passport';
import GoogleStrategy from 'passport-google-oauth20';
import User from '../models/User.js';

passport.use('google-login', new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_SECRET,
        callbackURL: `${process.env.SERVER_GOOGLE_CALLBACK}/google-login/callback`
    },
    async (accessToken, refreshToken, profile, done) => {
        try {
            let user = await User.findOne({ googleId: profile.id });

            if (!user) {
                user = new User({
                    googleId: profile.id,
                    name: profile.name.givenName,
                    surname: profile.name.familyName,
                    email: profile.emails[0].value,
                });
                await user.save();
            }
            return done(null, user);
        } catch (err) {
            return done(err, null);
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
    } catch (err) {
        done(err, null);
    }
});

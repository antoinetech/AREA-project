import passport from 'passport';
import { Strategy as GithubStrategy } from 'passport-github2';
import User from "../models/User.js";
import Github from "../models/Github.js";

passport.use('github', new GithubStrategy({
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_SECRET,
        callbackURL: `${process.env.SERVER_URL_CALLBACK}/github/callback`,
        passReqToCallback: true,
        scopes: [
            'repo', 'repo:status', 'repo_deployment', 'public_repo', 'repo:invite', 'security_events',
            'admin:repo_hook', 'write:repo_hook', 'read:repo_hook',
            'admin:org', 'write:org', 'read:org',
            'admin:public_key', 'write:public_key', 'read:public_key',
            'admin:org_hook', 'gist', 'notifications',
            'user', 'read:user', 'user:email', 'user:follow',
            'project', 'read:project', 'delete_repo',
            'write:packages', 'read:packages', 'delete:packages',
            'admin:gpg_key', 'write:gpg_key', 'read:gpg_key',
            'codespace', 'workflow'
        ]
    },
    async (req, accessToken, refreshToken, profile, done) => {
        try {

            if (!req.user || !req.user.id) {
                return done(null, false, { message: 'User not authenticated or ID missing' });
            }
            const githubAccount = await Github.findOneAndUpdate(
                { userId: req.user.id },
                {
                    userId: req.user.id,
                    githubId: profile.id,
                    username: profile.username,
                    accessToken: accessToken,
                    refreshToken: refreshToken || "",
                    profileUrl: profile.profileUrl || ""
                },
                { upsert: true, new: true }
            );
            return done(null, githubAccount);
        } catch (err) {
            return done(err);
        }
    }
));

passport.serializeUser((user, done) => {
    done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        if (user) {
            done(null, user);
        } else {
            done(null, false);
        }
    } catch (error) {
        console.error('Erreur lors de la désérialisation:', error);
        done(error);
    }
});


export default passport;

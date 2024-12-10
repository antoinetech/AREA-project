import passport from 'passport';
import { Strategy as SpotifyStrategy } from 'passport-spotify';
import User from "../models/User.js";
import axios from "axios";
import Microsoft from "../models/Microsoft.js";
import Spotify from "../models/Spotify.js";

passport.use('spotify', new SpotifyStrategy({
        clientID: process.env.SPOTIFY_CLIENT_ID,
        clientSecret: process.env.SPOTIFY_SECRET,
        callbackURL: `${process.env.SERVER_URL_CALLBACK}/spotify/callback`,
        passReqToCallback: true,
        scope: [
            'user-read-private',
            'user-read-email',
            'user-library-read',
            'user-library-modify',
            'playlist-read-private',
            'playlist-read-collaborative',
            'playlist-modify-public',
            'playlist-modify-private',
            'user-follow-read',
            'user-follow-modify',
            'user-read-playback-state',
            'user-modify-playback-state',
            'user-read-currently-playing',
            'user-read-recently-played',
            'user-top-read',
            'streaming',
            'app-remote-control',
            'ugc-image-upload'
        ]
    },
    async (req, accessToken, refreshToken, expires_in, profile, done) => {
        try {
            const user = req.session.user;
            if (!user) {
                return done(null, false, { message: 'User not authenticated' });
            }

            const profileResponse = await axios.get('https://api.spotify.com/v1/me', {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            });

            const profileData = profileResponse.data;

            let spotifyAccount = await Spotify.findOne({ userId: user._id });
            if (spotifyAccount) {
                spotifyAccount.spotifyId = profileData.id;
                spotifyAccount.displayName = profileData.display_name;
                spotifyAccount.email = profileData.email;
                spotifyAccount.avatarUrl = profileData.images.length > 0 ? profileData.images[0].url : null;
                spotifyAccount.accessToken = accessToken;
                spotifyAccount.refreshToken = refreshToken || spotifyAccount.refreshToken;
                spotifyAccount.tokenExpiration = Date.now() + expires_in * 1000;
                await spotifyAccount.save();
            } else {
                spotifyAccount = new Spotify({
                    userId: user._id,
                    spotifyId: profileData.id,
                    displayName: profileData.display_name,
                    email: profileData.email,
                    avatarUrl: profileData.images.length > 0 ? profileData.images[0].url : null,
                    accessToken: accessToken,
                    refreshToken: refreshToken,
                    tokenExpiration: Date.now() + expires_in * 1000
                });
                await spotifyAccount.save();
            }

            return done(null, spotifyAccount);
        } catch (err) {
            console.error('Erreur lors de la configuration de SpotifyStrategy :', err);
            return done(err);
        }
    }
));

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


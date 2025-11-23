// server/auth.js
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";

passport.use(new GoogleStrategy(
  {
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:5000/auth/google/callback"
  },
  (accessToken, refreshToken, profile, done) => {
    // Here you could check in DB if user exists or create them
    const user = {
      id: profile.id,
      name: profile.displayName,
      email: profile.emails?.[0]?.value
    };
    return done(null, user);
  }
));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

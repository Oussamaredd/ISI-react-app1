// server/auth.js
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";

const callbackURL =
  process.env.GOOGLE_CALLBACK_URL ||
  "http://localhost:5000/auth/google/callback";
// Configure the Google strategy for use by Passport.
passport.use(new GoogleStrategy(
  {
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL
  },
  (accessToken, refreshToken, profile, done) => {
    const email =
      profile.emails && profile.emails.length > 0
        ? profile.emails[0].value
        : null;
    // Here you could check in DB if user exists or create them
    const user = {
        id: profile.id,
        displayName: profile.displayName, // keep raw name here
        email,                            // normalized email
      };
    return done(null, user);
  }
));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

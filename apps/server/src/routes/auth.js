// server/src/routes/auth.js
// ---- /auth/me file that uses the currentUser attached by middleware/auth.js ----
import express from "express";
import passport from "passport";
import { pool } from "../config/db.js";

const router = express.Router();

router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  async (req, res) => {
    try {
      const googleId = req.user.id;
      const name = req.user.displayName;
      const email = req.user.email;

      if (!email) {
        return res.status(400).send("Google account did not provide an email.");
      }

      // Save user info in session
      req.session.user = { id: googleId, name, email };

      // Import models here to avoid circular dependency
      const { UserModel } = await import('../models/userModel.js');

      // Check if user exists, create if not
      let user = await UserModel.findByGoogleId(googleId);
      
      if (!user) {
        user = await UserModel.create({ google_id: googleId, email, name });
      } else {
        // Update last login
        await UserModel.updateLastLogin(user.id);
      }

      const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173";
      res.redirect(`${clientOrigin}/`);
    } catch (err) {
      console.error("ƒ?O Error in Google callback:", err);
      res.sendStatus(500);
    }
  }
);

router.get("/logout", (req, res) => {
  const isProduction = process.env.NODE_ENV === "production";
  req.logout(() => {
    req.session.destroy(() => {
      res.clearCookie("isi.sid", {
        httpOnly: true,
        sameSite: isProduction ? "none" : "lax",
        secure: isProduction,
        path: "/",
      });
      res.status(200).json({ message: "Logged out" });
    });
  });
});

router.get("/me", (req, res) => {
  const user = req.currentUser;
  if (!user) return res.sendStatus(401);
  res.json(user);
});

export default router;

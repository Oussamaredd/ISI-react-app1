// server/src/routes/auth.js
// ---- /auth/me file that uses the currentUser attached by middleware/auth.js ----
import express from "express";
import passport from "passport";
import { pool } from "../config/db.js";

const router = express.Router();

router.get("/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get("/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  async (req, res) => {
    try {
    const googleId = req.user.id;
    const name = req.user.displayName;
    const email = req.user.email;
   // Ensure email is present
    if (!email) {
      return res.status(400).send("Google account did not provide an email.");
    }
    // Save user info in session
    req.session.user = { id: googleId, name, email };
    // Upsert user into database
    await pool.query(
      `
      INSERT INTO users (google_id, email, name)
      VALUES ($1, $2, $3)
      ON CONFLICT (google_id)
      DO UPDATE SET email = EXCLUDED.email,
                    name = EXCLUDED.name
      `,
      [googleId, email, name]
    );
    res.redirect("http://localhost:3000/");
    } catch (err) {
      console.error("❌ Error in Google callback:", err);
      res.sendStatus(500);
    }
  }
);

router.get("/logout", 
  (req, res) => {
  req.logout(() => {
    req.session.destroy(() => {
      res.clearCookie("isi.sid", {
        httpOnly: true,
        sameSite: "lax",
        secure: false, // true only under HTTPS
        path: "/",
      });
      res.status(200).json({ message: "Logged out" });
    });
  });
});

router.get("/me", 
  (req, res) => {
  const user = req.currentUser;
  if (!user) return res.sendStatus(401);
  res.json(user);
});

export default router;

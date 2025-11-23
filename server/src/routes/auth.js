// server/src/routes/auth.js
import express from "express";
import passport from "passport";

const router = express.Router();

router.get("/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  (req, res) => {
    req.session.user = {
      id: req.user.id,
      name: req.user.displayName,
      email: req.user.emails?.[0]?.value,
    };
    res.redirect("http://localhost:3000/");
  }
);

router.get("/logout", (req, res) => {
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

router.get("/me", (req, res) => {
  const user = req.user || req.session?.user;
  if (!user) return res.sendStatus(401);
  res.json(user);
});

export default router;

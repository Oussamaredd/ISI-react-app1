// server/src/middleware/auth.js
export function attachCurrentUser(req, _res, next) {
    const user = req.user || req.session?.user || null;
    req.currentUser = user;
    next();
}

export function requireAuth(req, res, next) {
    const user = req.currentUser || req.user || req.session?.user;
    if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    next();
}

export function requireRole(role) {
    return (req, res, next) => {
        const user = req.currentUser || req.user || req.session?.user;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const roles = user.roles || (user.role ? [user.role] : []);
    if (!roles.includes(role)) {
        return res.status(403).json({ error: "Forbidden" });
    }
    next();
    };
}

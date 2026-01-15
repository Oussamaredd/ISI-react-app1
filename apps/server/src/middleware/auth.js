// server/src/middleware/auth.js
import { UserModel } from '../models/userModel.js';

export async function attachCurrentUser(req, _res, next) {
    try {
        const sessionUser = req.user || req.session?.user || null;
        
        if (!sessionUser) {
            req.currentUser = null;
            return next();
        }

        // Get full user data with roles and permissions
        let user;
        if (sessionUser.google_id) {
            user = await UserModel.findByGoogleId(sessionUser.google_id);
        } else if (sessionUser.id) {
            user = await UserModel.findById(sessionUser.id);
        }

        req.currentUser = user;
        next();
    } catch (error) {
        console.error('Error attaching current user:', error);
        req.currentUser = null;
        next();
    }
}

export function requireAuth(req, res, next) {
    const user = req.currentUser || req.user || req.session?.user;
    if (!user || !user.is_active) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    next();
}

export function requireRole(role) {
    return async (req, res, next) => {
        const user = req.currentUser || req.user || req.session?.user;
        if (!user || !user.is_active) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        // Check if user has the required role
        const userRoles = user.roles || [];
        const hasRole = userRoles.some(userRole => 
            userRole.name === role || 
            userRole.display_name === role ||
            (user.role && user.role === role) // Legacy support
        );

        if (!hasRole) {
            return res.status(403).json({ error: "Forbidden - Insufficient privileges" });
        }

        next();
    };
}

export function requirePermission(permission) {
    return async (req, res, next) => {
        const user = req.currentUser || req.user || req.session?.user;
        if (!user || !user.is_active) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const [resource, action] = permission.split(':');
        let hasPermission = false;

        // Check permissions from user roles
        if (user.roles && user.roles.length > 0) {
            for (const role of user.roles) {
                if (role.permissions && role.permissions[resource]) {
                    const rolePermissions = Array.isArray(role.permissions[resource]) 
                        ? role.permissions[resource] 
                        : [];
                    if (rolePermissions.includes(action) || rolePermissions.includes('*')) {
                        hasPermission = true;
                        break;
                    }
                }
            }
        }

        // Fallback to legacy role check
        if (!hasPermission && user.role) {
            const rolePermissions = {
                'super_admin': '*',
                'admin': ['users:read', 'users:update', 'hotels:*', 'tickets:*', 'audit_logs:read'],
                'manager': ['hotels:read', 'tickets:*', 'users:read'],
                'user': ['tickets:create', 'tickets:read', 'hotels:read']
            };

            for (const perm of rolePermissions[user.role] || []) {
                if (perm === '*' || perm === permission) {
                    hasPermission = true;
                    break;
                }
            }
        }

        if (!hasPermission) {
            return res.status(403).json({ error: "Forbidden - Insufficient permissions" });
        }

        next();
    };
}

// Higher-order function to require any of multiple permissions
export function requireAnyPermission(permissions) {
    return async (req, res, next) => {
        const user = req.currentUser || req.user || req.session?.user;
        if (!user || !user.is_active) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        for (const permission of permissions) {
            const [resource, action] = permission.split(':');
            let hasPermission = false;

            // Check permissions from user roles
            if (user.roles && user.roles.length > 0) {
                for (const role of user.roles) {
                    if (role.permissions && role.permissions[resource]) {
                        const rolePermissions = Array.isArray(role.permissions[resource]) 
                            ? role.permissions[resource] 
                            : [];
                        if (rolePermissions.includes(action) || rolePermissions.includes('*')) {
                            hasPermission = true;
                            break;
                        }
                    }
                }
            }

            if (hasPermission) {
                return next();
            }
        }

        return res.status(403).json({ error: "Forbidden - Insufficient permissions" });
    };
}

// Middleware to log user activity
export function logActivity(action, resourceType) {
    return async (req, res, next) => {
        const originalSend = res.send;
        let responseData;

        res.send = function(data) {
            responseData = data;
            originalSend.call(this, data);
        };

        res.on('finish', async () => {
            try {
                if (req.currentUser && res.statusCode < 400) {
                    const { AuditLogModel } = await import('../models/auditLogModel.js');
                    await AuditLogModel.create({
                        user_id: req.currentUser.id,
                        action,
                        resource_type: resourceType,
                        resource_id: req.params.id || null,
                        ip_address: req.ip,
                        user_agent: req.get('User-Agent'),
                        new_values: req.body || null
                    });
                }
            } catch (error) {
                console.error('Error logging activity:', error);
            }
        });

        next();
    };
}

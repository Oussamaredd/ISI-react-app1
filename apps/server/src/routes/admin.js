import express from 'express';
import { AdminController } from '../controllers/adminController.js';
import { requireAuth, requirePermission, logActivity } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication middleware to all admin routes
router.use(requireAuth);

// User Management Routes
router.get('/users', requirePermission('users:read'), AdminController.getUsers);
router.get('/users/:id', requirePermission('users:read'), AdminController.getUserById);
router.put('/users/:id/roles', requirePermission('users:update'), AdminController.updateUserRoles);
router.put('/users/:id/status', requirePermission('users:update'), AdminController.updateUserStatus);

// Role Management Routes
router.get('/roles', requirePermission('roles:read'), AdminController.getRoles);
router.get('/roles/permissions', requirePermission('roles:read'), AdminController.getAvailablePermissions);
router.get('/roles/:id', requirePermission('roles:read'), AdminController.getRoleById);
router.post('/roles', requirePermission('roles:create'), logActivity('role_created', 'roles'), AdminController.createRole);
router.put('/roles/:id', requirePermission('roles:update'), AdminController.updateRole);
router.delete('/roles/:id', requirePermission('roles:delete'), AdminController.deleteRole);
router.get('/roles/:id/users', requirePermission('roles:read'), AdminController.getRoleUsers);

// Audit Logs Routes
router.get('/audit-logs', requirePermission('audit_logs:read'), AdminController.getAuditLogs);
router.get('/audit-logs/stats', requirePermission('audit_logs:read'), AdminController.getAuditStats);
router.get('/users/:userId/audit-logs', requirePermission('audit_logs:read'), AdminController.getUserAuditLogs);

// System Settings Routes
router.get('/settings', requirePermission('system:manage'), AdminController.getSystemSettings);
router.put('/settings', requirePermission('system:manage'), AdminController.updateSystemSettings);

export default router;
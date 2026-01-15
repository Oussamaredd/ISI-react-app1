import { UserModel } from '../models/userModel.js';
import { RoleModel } from '../models/roleModel.js';
import { AuditLogModel } from '../models/auditLogModel.js';

export class AdminController {
  // User Management
  static async getUsers(req, res) {
    try {
      const { page = 1, limit = 20, search, role } = req.query;
      const filters = { search, role };
      
      const result = await UserModel.getAllUsers(
        parseInt(page), 
        parseInt(limit), 
        filters
      );
      
      res.json(result);
    } catch (error) {
      console.error('Error getting users:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getUserById(req, res) {
    try {
      const { id } = req.params;
      const user = await UserModel.findById(id);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.json(user);
    } catch (error) {
      console.error('Error getting user:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async updateUserRoles(req, res) {
    try {
      const { id } = req.params;
      const { roleIds } = req.body;
      
      if (!Array.isArray(roleIds)) {
        return res.status(400).json({ error: 'roleIds must be an array' });
      }
      
      const oldUser = await UserModel.findById(id);
      if (!oldUser) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      const updatedUser = await UserModel.updateUserRole(
        id, 
        roleIds, 
        req.currentUser.id
      );
      
      // Log the action
      await AuditLogModel.create({
        user_id: req.currentUser.id,
        action: 'user_roles_updated',
        resource_type: 'users',
        resource_id: parseInt(id),
        old_values: { roles: oldUser.roles },
        new_values: { roles: updatedUser.roles },
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      });
      
      res.json(updatedUser);
    } catch (error) {
      console.error('Error updating user roles:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async updateUserStatus(req, res) {
    try {
      const { id } = req.params;
      const { is_active } = req.body;
      
      if (typeof is_active !== 'boolean') {
        return res.status(400).json({ error: 'is_active must be a boolean' });
      }
      
      const oldUser = await UserModel.findById(id);
      if (!oldUser) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      const updatedUser = await UserModel.updateUserStatus(
        id, 
        is_active, 
        req.currentUser.id
      );
      
      // Log the action
      await AuditLogModel.create({
        user_id: req.currentUser.id,
        action: is_active ? 'user_activated' : 'user_deactivated',
        resource_type: 'users',
        resource_id: parseInt(id),
        old_values: { is_active: oldUser.is_active },
        new_values: { is_active: updatedUser.is_active },
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      });
      
      res.json(updatedUser);
    } catch (error) {
      console.error('Error updating user status:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Role Management
  static async getRoles(req, res) {
    try {
      const roles = await RoleModel.getAllRoles();
      res.json(roles);
    } catch (error) {
      console.error('Error getting roles:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getRoleById(req, res) {
    try {
      const { id } = req.params;
      const role = await RoleModel.findById(id);
      
      if (!role) {
        return res.status(404).json({ error: 'Role not found' });
      }
      
      res.json(role);
    } catch (error) {
      console.error('Error getting role:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async createRole(req, res) {
    try {
      const { name, display_name, description, permissions } = req.body;
      
      // Validate input
      if (!name || !display_name) {
        return res.status(400).json({ error: 'name and display_name are required' });
      }
      
      const availablePermissions = await RoleModel.getAvailablePermissions();
      
      // Validate permissions
      for (const [resource, actions] of Object.entries(permissions || {})) {
        if (!availablePermissions[resource]) {
          return res.status(400).json({ 
            error: `Invalid resource: ${resource}. Available resources: ${Object.keys(availablePermissions).join(', ')}` 
          });
        }
        
        for (const action of actions) {
          if (!availablePermissions[resource].includes(action) && action !== '*') {
            return res.status(400).json({ 
              error: `Invalid action: ${action} for resource: ${resource}. Available actions: ${availablePermissions[resource].join(', ')}` 
            });
          }
        }
      }
      
      const role = await RoleModel.create({
        name,
        display_name,
        description,
        permissions: permissions || {}
      });
      
      // Log the action
      await AuditLogModel.create({
        user_id: req.currentUser.id,
        action: 'role_created',
        resource_type: 'roles',
        resource_id: role.id,
        new_values: { name, display_name, description, permissions },
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      });
      
      res.status(201).json(role);
    } catch (error) {
      console.error('Error creating role:', error);
      
      if (error.code === '23505') { // Unique violation
        return res.status(400).json({ error: 'Role name already exists' });
      }
      
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async updateRole(req, res) {
    try {
      const { id } = req.params;
      const { display_name, description, permissions } = req.body;
      
      const existingRole = await RoleModel.findById(id);
      if (!existingRole) {
        return res.status(404).json({ error: 'Role not found' });
      }
      
      if (existingRole.is_system) {
        return res.status(403).json({ error: 'Cannot modify system roles' });
      }
      
      const availablePermissions = await RoleModel.getAvailablePermissions();
      
      // Validate permissions if provided
      if (permissions) {
        for (const [resource, actions] of Object.entries(permissions)) {
          if (!availablePermissions[resource]) {
            return res.status(400).json({ 
              error: `Invalid resource: ${resource}. Available resources: ${Object.keys(availablePermissions).join(', ')}` 
            });
          }
          
          for (const action of actions) {
            if (!availablePermissions[resource].includes(action) && action !== '*') {
              return res.status(400).json({ 
                error: `Invalid action: ${action} for resource: ${resource}. Available actions: ${availablePermissions[resource].join(', ')}` 
              });
            }
          }
        }
      }
      
      const updatedRole = await RoleModel.update(id, {
        display_name,
        description,
        permissions: permissions || existingRole.permissions
      });
      
      // Log the action
      await AuditLogModel.create({
        user_id: req.currentUser.id,
        action: 'role_updated',
        resource_type: 'roles',
        resource_id: parseInt(id),
        old_values: { 
          display_name: existingRole.display_name, 
          description: existingRole.description, 
          permissions: existingRole.permissions 
        },
        new_values: { display_name, description, permissions: permissions || existingRole.permissions },
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      });
      
      res.json(updatedRole);
    } catch (error) {
      console.error('Error updating role:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async deleteRole(req, res) {
    try {
      const { id } = req.params;
      
      const existingRole = await RoleModel.findById(id);
      if (!existingRole) {
        return res.status(404).json({ error: 'Role not found' });
      }
      
      if (existingRole.is_system) {
        return res.status(403).json({ error: 'Cannot delete system roles' });
      }
      
      if (existingRole.user_count > 0) {
        return res.status(400).json({ 
          error: 'Cannot delete role that is assigned to users. Please reassign users first.' 
        });
      }
      
      const deletedRole = await RoleModel.delete(id);
      
      // Log the action
      await AuditLogModel.create({
        user_id: req.currentUser.id,
        action: 'role_deleted',
        resource_type: 'roles',
        resource_id: parseInt(id),
        old_values: existingRole,
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      });
      
      res.json(deletedRole);
    } catch (error) {
      console.error('Error deleting role:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getRoleUsers(req, res) {
    try {
      const { id } = req.params;
      const { page = 1, limit = 20 } = req.query;
      
      const result = await RoleModel.getRoleUsers(
        id, 
        parseInt(page), 
        parseInt(limit)
      );
      
      res.json(result);
    } catch (error) {
      console.error('Error getting role users:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getAvailablePermissions(req, res) {
    try {
      const permissions = await RoleModel.getAvailablePermissions();
      res.json(permissions);
    } catch (error) {
      console.error('Error getting available permissions:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Audit Logs
  static async getAuditLogs(req, res) {
    try {
      const { page = 1, limit = 20, user_id, action, resource_type, date_from, date_to } = req.query;
      
      const filters = {};
      if (user_id) filters.user_id = user_id;
      if (action) filters.action = action;
      if (resource_type) filters.resource_type = resource_type;
      if (date_from) filters.date_from = date_from;
      if (date_to) filters.date_to = date_to;
      
      const result = await AuditLogModel.getAll(
        filters,
        parseInt(page),
        parseInt(limit)
      );
      
      res.json(result);
    } catch (error) {
      console.error('Error getting audit logs:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getAuditStats(req, res) {
    try {
      const stats = await AuditLogModel.getAuditStats();
      res.json(stats);
    } catch (error) {
      console.error('Error getting audit stats:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getUserAuditLogs(req, res) {
    try {
      const { userId } = req.params;
      const { page = 1, limit = 20 } = req.query;
      
      const result = await AuditLogModel.findByUser(
        userId,
        parseInt(page),
        parseInt(limit)
      );
      
      res.json(result);
    } catch (error) {
      console.error('Error getting user audit logs:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // System Settings
  static async getSystemSettings(req, res) {
    try {
      // This could be expanded to include various system settings
      const settings = {
        user_registration: true,
        default_user_role: 'user',
        session_timeout: 24 * 60 * 60 * 1000, // 24 hours
        audit_log_retention: 90, // days
        max_login_attempts: 5,
        password_min_length: 8
      };
      
      res.json(settings);
    } catch (error) {
      console.error('Error getting system settings:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async updateSystemSettings(req, res) {
    try {
      const settings = req.body;
      
      // Log the action
      await AuditLogModel.create({
        user_id: req.currentUser.id,
        action: 'system_settings_updated',
        resource_type: 'system',
        new_values: settings,
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      });
      
      // In a real implementation, you would save these to a settings table
      res.json({ message: 'System settings updated successfully', settings });
    } catch (error) {
      console.error('Error updating system settings:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
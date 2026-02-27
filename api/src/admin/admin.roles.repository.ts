import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { asc, eq, sql } from 'drizzle-orm';
import { roles, type DatabaseClient } from 'ecotrack-database';

import { DRIZZLE } from '../database/database.constants.js';

const AVAILABLE_PERMISSIONS = [
  'users.read',
  'users.write',
  'roles.read',
  'roles.write',
  'tickets.read',
  'tickets.write',
  'audit.read',
  'settings.write',
  'ecotrack.containers.read',
  'ecotrack.containers.write',
  'ecotrack.zones.read',
  'ecotrack.zones.write',
  'ecotrack.tours.read',
  'ecotrack.tours.write',
  'ecotrack.citizenReports.read',
  'ecotrack.citizenReports.write',
  'ecotrack.gamification.read',
  'ecotrack.gamification.write',
  'ecotrack.analytics.read',
];
const AVAILABLE_PERMISSIONS_SET = new Set(AVAILABLE_PERMISSIONS.map((permission) => permission.toLowerCase()));

const DEFAULT_ROLES = [
  {
    name: 'super_admin',
    description: 'Super Administrator',
    permissions: [
      'users.read',
      'users.write',
      'roles.read',
      'roles.write',
      'tickets.read',
      'tickets.write',
      'audit.read',
      'settings.write',
      'ecotrack.containers.read',
      'ecotrack.containers.write',
      'ecotrack.zones.read',
      'ecotrack.zones.write',
      'ecotrack.tours.read',
      'ecotrack.tours.write',
      'ecotrack.citizenReports.read',
      'ecotrack.citizenReports.write',
      'ecotrack.gamification.read',
      'ecotrack.gamification.write',
      'ecotrack.analytics.read',
    ],
  },
  {
    name: 'admin',
    description: 'Administrator',
    permissions: [
      'users.read',
      'users.write',
      'roles.read',
      'roles.write',
      'tickets.read',
      'tickets.write',
      'audit.read',
      'settings.write',
      'ecotrack.containers.read',
      'ecotrack.containers.write',
      'ecotrack.zones.read',
      'ecotrack.zones.write',
      'ecotrack.tours.read',
      'ecotrack.tours.write',
      'ecotrack.citizenReports.read',
      'ecotrack.citizenReports.write',
      'ecotrack.gamification.read',
      'ecotrack.gamification.write',
      'ecotrack.analytics.read',
    ],
  },
  {
    name: 'manager',
    description: 'Manager',
    permissions: [
      'users.read',
      'tickets.read',
      'audit.read',
      'ecotrack.containers.read',
      'ecotrack.zones.read',
      'ecotrack.tours.read',
      'ecotrack.tours.write',
      'ecotrack.citizenReports.read',
      'ecotrack.gamification.read',
      'ecotrack.analytics.read',
    ],
  },
  {
    name: 'agent',
    description: 'Agent',
    permissions: [
      'tickets.read',
      'tickets.write',
      'ecotrack.containers.read',
      'ecotrack.tours.read',
      'ecotrack.tours.write',
      'ecotrack.citizenReports.read',
      'ecotrack.citizenReports.write',
    ],
  },
  {
    name: 'citizen',
    description: 'Citizen',
    permissions: [
      'ecotrack.containers.read',
      'ecotrack.citizenReports.read',
      'ecotrack.citizenReports.write',
      'ecotrack.gamification.read',
    ],
  },
];

@Injectable()
export class AdminRolesRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DatabaseClient) {}

  getAvailablePermissions() {
    return AVAILABLE_PERMISSIONS;
  }

  async listRoles() {
    await this.ensureDefaultRoles();
    return this.db.select().from(roles).orderBy(asc(roles.name));
  }

  async createRole(payload: { name: string; description?: string; permissions?: string[] }) {
    const name = payload.name?.trim();
    if (!name) {
      throw new BadRequestException('Role name is required');
    }

    const existing = await this.db.query.roles.findFirst({ where: eq(roles.name, name) });
    if (existing) {
      throw new BadRequestException('Role name already exists');
    }

    const permissions = this.normalizePermissions(payload.permissions);

    const [created] = await this.db
      .insert(roles)
      .values({
        name,
        description: payload.description?.trim() || null,
        permissions,
      })
      .returning();

    if (!created) {
      throw new BadRequestException('Failed to create role');
    }

    return created;
  }

  async updateRole(roleId: string, payload: { name?: string; description?: string; permissions?: string[] }) {
    const updates: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (payload.name !== undefined) {
      const name = payload.name.trim();
      if (!name) {
        throw new BadRequestException('Role name cannot be empty');
      }
      const existing = await this.db.query.roles.findFirst({ where: eq(roles.name, name) });
      if (existing && existing.id !== roleId) {
        throw new BadRequestException('Role name already exists');
      }
      updates.name = name;
    }

    if (payload.description !== undefined) {
      updates.description = payload.description?.trim() || null;
    }

    if (payload.permissions !== undefined) {
      updates.permissions = this.normalizePermissions(payload.permissions);
    }

    const [updated] = await this.db
      .update(roles)
      .set(updates)
      .where(eq(roles.id, roleId))
      .returning();

    if (!updated) {
      throw new NotFoundException(`Role ${roleId} not found`);
    }

    return updated;
  }

  async deleteRole(roleId: string) {
    const [deleted] = await this.db.delete(roles).where(eq(roles.id, roleId)).returning();
    if (!deleted) {
      throw new NotFoundException(`Role ${roleId} not found`);
    }
    return deleted;
  }

  private async ensureDefaultRoles() {
    const [existing] = await this.db
      .select({ count: sql`count(*)`.mapWith(Number) })
      .from(roles);

    if ((existing?.count ?? 0) > 0) {
      return;
    }

    await this.db.insert(roles).values(
      DEFAULT_ROLES.map((role) => ({
        name: role.name,
        description: role.description,
        permissions: role.permissions,
      })),
    );
  }

  private normalizePermissions(rawPermissions?: string[]) {
    const normalizedPermissions = Array.isArray(rawPermissions)
      ? rawPermissions
          .map((permission) => (typeof permission === 'string' ? permission.trim().toLowerCase() : ''))
          .filter((permission): permission is string => permission.length > 0)
      : [];

    const deduplicatedPermissions = Array.from(new Set(normalizedPermissions));
    const unsupportedPermissions = deduplicatedPermissions.filter(
      (permission) => !AVAILABLE_PERMISSIONS_SET.has(permission),
    );

    if (unsupportedPermissions.length > 0) {
      throw new BadRequestException(`Unknown permissions: ${unsupportedPermissions.join(', ')}`);
    }

    return deduplicatedPermissions;
  }
}

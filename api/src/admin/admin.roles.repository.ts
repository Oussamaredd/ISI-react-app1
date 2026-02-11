import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { asc, eq, sql } from 'drizzle-orm';
import { roles, type DatabaseClient } from 'react-app1-database';

import { DRIZZLE } from '../database/database.constants.js';

const AVAILABLE_PERMISSIONS = [
  'users.read',
  'users.write',
  'roles.read',
  'roles.write',
  'hotels.read',
  'hotels.write',
  'tickets.read',
  'tickets.write',
  'audit.read',
  'settings.write',
];

const DEFAULT_ROLES = [
  {
    name: 'admin',
    description: 'Administrator',
    permissions: [
      'users.read',
      'users.write',
      'roles.read',
      'roles.write',
      'hotels.read',
      'hotels.write',
      'tickets.read',
      'tickets.write',
      'audit.read',
      'settings.write',
    ],
  },
  {
    name: 'manager',
    description: 'Manager',
    permissions: ['users.read', 'hotels.read', 'tickets.read', 'audit.read'],
  },
  {
    name: 'agent',
    description: 'Agent',
    permissions: ['tickets.read', 'tickets.write'],
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

    const permissions = Array.isArray(payload.permissions)
      ? payload.permissions.filter(Boolean)
      : [];

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
      updates.permissions = Array.isArray(payload.permissions)
        ? payload.permissions.filter(Boolean)
        : [];
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
}

import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import { type DatabaseClient, hotels, roles, userRoles, users } from 'react-app1-database';

import type { AuthUser } from '../auth/auth.types.js';
import { DRIZZLE } from '../database/database.constants.js';

const DEFAULT_ROLE = 'agent';
const DEFAULT_HOTEL_SLUG = 'default-hotel';

type UserFilters = {
  search?: string;
  role?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
};

@Injectable()
export class UsersRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DatabaseClient) {}

  async findByEmail(email: string) {
    if (!email) return null;
    return this.db.query.users.findFirst({
      where: eq(users.email, email),
    });
  }

  async findById(id: string) {
    return this.db.query.users.findFirst({
      where: eq(users.id, id),
    });
  }

  async ensureUserForAuth(authUser: AuthUser) {
    if (!authUser?.email) {
      return null;
    }

    const existing = await this.findByEmail(authUser.email);
    if (existing) {
      return existing;
    }

    const hotelId = await this.ensureDefaultHotel();
    const displayName = authUser.name?.trim() || authUser.email.split('@')[0] || 'User';

    const [created] = await this.db
      .insert(users)
      .values({
        email: authUser.email,
        displayName,
        avatarUrl: authUser.avatarUrl ?? null,
        role: DEFAULT_ROLE,
        hotelId,
      })
      .returning();

    return created ?? null;
  }

  async listUsers(filters: UserFilters = {}) {
    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const limit = filters.limit && filters.limit > 0 ? Math.min(filters.limit, 100) : 20;
    const offset = (page - 1) * limit;

    const conditions = [];
    const search = filters.search?.trim();
    if (search) {
      const pattern = `%${search}%`;
      conditions.push(or(ilike(users.email, pattern), ilike(users.displayName, pattern)));
    }

    if (filters.role) {
      conditions.push(eq(users.role, filters.role));
    }

    if (typeof filters.isActive === 'boolean') {
      conditions.push(eq(users.isActive, filters.isActive));
    }

    const where = conditions.length ? and(...conditions) : undefined;

    const countQuery = this.db.select({ total: sql`count(*)`.mapWith(Number) }).from(users);
    const listQuery = this.db
      .select()
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);

    const [rows, countRows] = await Promise.all([
      where ? listQuery.where(where) : listQuery,
      where ? countQuery.where(where) : countQuery,
    ]);

    const total = countRows[0]?.total ?? rows.length;
    const userIds = rows.map((row) => row.id);
    const rolesByUser = userIds.length ? await this.getRolesForUsers(userIds) : new Map();

    const usersWithRoles = rows.map((row) => ({
      ...row,
      roles: rolesByUser.get(row.id) ?? [],
    }));

    return { users: usersWithRoles, total, page, pageSize: limit };
  }

  async getUserWithRoles(id: string) {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }

    const rolesForUser = await this.getRolesForUser(id);
    return { ...user, roles: rolesForUser };
  }

  async getUserWithRolesByEmail(email: string) {
    const user = await this.findByEmail(email);
    if (!user) return null;
    const rolesForUser = await this.getRolesForUser(user.id);
    return { ...user, roles: rolesForUser };
  }

  async updateUserStatus(userId: string, isActive: boolean) {
    const [updated] = await this.db
      .update(users)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();

    if (!updated) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    const rolesForUser = await this.getRolesForUser(userId);
    return { ...updated, roles: rolesForUser };
  }

  async updateUserRoles(userId: string, roleIds: string[]) {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    const resolvedRoleIds = Array.isArray(roleIds) ? roleIds.filter(Boolean) : [];
    let rolesForUser: Array<{ id: string; name: string }> = [];

    await this.db.transaction(async (tx) => {
      await tx.delete(userRoles).where(eq(userRoles.userId, userId));

      if (resolvedRoleIds.length > 0) {
        const rolesRows = await tx
          .select()
          .from(roles)
          .where(inArray(roles.id, resolvedRoleIds));

        if (rolesRows.length !== resolvedRoleIds.length) {
          throw new NotFoundException('One or more roles were not found');
        }

        await tx.insert(userRoles).values(
          rolesRows.map((role) => ({
            userId,
            roleId: role.id,
          })),
        );

        rolesForUser = rolesRows.map((role) => ({
          id: role.id,
          name: role.name,
        }));

        const primaryRole = this.pickPrimaryRole(rolesRows.map((role) => role.name));
        await tx
          .update(users)
          .set({ role: primaryRole, updatedAt: new Date() })
          .where(eq(users.id, userId));
      } else {
        rolesForUser = [];
        await tx
          .update(users)
          .set({ role: DEFAULT_ROLE, updatedAt: new Date() })
          .where(eq(users.id, userId));
      }
    });

    const updatedUser = await this.findById(userId);
    return { ...(updatedUser ?? user), roles: rolesForUser };
  }

  async getRolesForUser(userId: string) {
    const rows = await this.db
      .select({
        id: roles.id,
        name: roles.name,
        permissions: roles.permissions,
      })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(userRoles.userId, userId));

    return rows;
  }

  async getRolesForUsers(userIds: string[]) {
    const rows = await this.db
      .select({
        userId: userRoles.userId,
        id: roles.id,
        name: roles.name,
      })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(inArray(userRoles.userId, userIds));

    const map = new Map<string, Array<{ id: string; name: string }>>();
    for (const row of rows) {
      const entry = map.get(row.userId) ?? [];
      entry.push({ id: row.id, name: row.name });
      map.set(row.userId, entry);
    }

    return map;
  }

  private pickPrimaryRole(roleNames: string[]) {
    if (roleNames.includes('super_admin')) return 'super_admin';
    if (roleNames.includes('admin')) return 'admin';
    if (roleNames.includes('manager')) return 'manager';
    return roleNames[0] ?? DEFAULT_ROLE;
  }

  private async ensureDefaultHotel(): Promise<string> {
    const [existing] = await this.db
      .select()
      .from(hotels)
      .where(eq(hotels.slug, DEFAULT_HOTEL_SLUG))
      .limit(1);
    if (existing?.id) return existing.id;

    const [created] = await this.db
      .insert(hotels)
      .values({
        name: 'Default Hotel',
        slug: DEFAULT_HOTEL_SLUG,
      })
      .onConflictDoNothing({ target: hotels.slug })
      .returning();

    if (created?.id) return created.id;

    const [fallback] = await this.db
      .select()
      .from(hotels)
      .where(eq(hotels.slug, DEFAULT_HOTEL_SLUG))
      .limit(1);

    if (!fallback?.id) {
      throw new Error('Failed to provision default hotel');
    }

    return fallback.id;
  }
}

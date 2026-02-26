import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq, gte, ilike, inArray, isNull, lte, or, sql } from 'drizzle-orm';
import { type DatabaseClient, passwordResetTokens, roles, userRoles, users } from 'ecotrack-database';

import type { AuthUser } from '../auth/auth.types.js';
import { DRIZZLE } from '../database/database.constants.js';

const DEFAULT_ROLE = 'agent';
const GOOGLE_SIGNIN_BLOCKED_BY_LOCAL_ACCOUNT_MESSAGE =
  'This email is registered with email/password. Please sign in with your password.';

type UserFilters = {
  search?: string;
  role?: string;
  isActive?: boolean;
  authProvider?: string;
  createdFrom?: Date;
  createdTo?: Date;
  page?: number;
  limit?: number;
};

type LocalUserRecord = {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  role: string;
  isActive: boolean;
  [key: string]: unknown;
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

  async findByGoogleId(googleId: string) {
    if (!googleId) return null;
    return this.db.query.users.findFirst({
      where: eq(users.googleId, googleId),
    });
  }

  async ensureUserForAuth(authUser: AuthUser) {
    if (!authUser) {
      return null;
    }

    if (authUser.provider === 'local') {
      if (authUser.id) {
        const byId = await this.findById(authUser.id);
        if (byId) {
          return byId;
        }
      }

      if (!authUser.email) {
        return null;
      }

      const byEmail = await this.findByEmail(authUser.email.trim());
      return byEmail ?? null;
    }

    if (!authUser.email) {
      return null;
    }

    const email = authUser.email.trim();
    const existingByEmail = await this.findByEmail(email);

    if (existingByEmail?.authProvider === 'local') {
      throw new ConflictException(GOOGLE_SIGNIN_BLOCKED_BY_LOCAL_ACCOUNT_MESSAGE);
    }

    const existingByGoogleId = authUser.id ? await this.findByGoogleId(authUser.id) : null;
    const existing = existingByGoogleId ?? existingByEmail;

    if (existing) {
      const displayName = authUser.name?.trim() || existing.displayName || email.split('@')[0] || 'User';

      const [updated] = await this.db
        .update(users)
        .set({
          displayName,
          avatarUrl: authUser.avatarUrl ?? existing.avatarUrl ?? null,
          authProvider: 'google',
          googleId: authUser.id,
          updatedAt: new Date(),
        })
        .where(eq(users.id, existing.id))
        .returning();

      return updated ?? existing;
    }

    const displayName = authUser.name?.trim() || email.split('@')[0] || 'User';

    const [upserted] = await this.db
      .insert(users)
      .values({
        email,
        passwordHash: null,
        authProvider: 'google',
        googleId: authUser.id,
        displayName,
        avatarUrl: authUser.avatarUrl ?? null,
        role: DEFAULT_ROLE,
      })
      .onConflictDoUpdate({
        target: users.email,
        set: {
          displayName,
          avatarUrl: authUser.avatarUrl ?? null,
          authProvider: 'google',
          googleId: authUser.id,
          updatedAt: new Date(),
        },
      })
      .returning();

    return upserted ?? this.findByEmail(email);
  }

  async createLocalUser(params: {
    email: string;
    passwordHash: string;
    displayName?: string;
    roleIds?: string[];
    isActive?: boolean;
  }): Promise<(LocalUserRecord & { roles: Array<{ id: string; name: string }> }) | null> {
    const email = params.email.trim();
    const existing = await this.findByEmail(email);
    if (existing) {
      throw new ConflictException('Email is already in use.');
    }

    const displayName = params.displayName?.trim() || email.split('@')[0] || 'User';
    const resolvedRoleIds = Array.isArray(params.roleIds) ? params.roleIds.filter(Boolean) : [];
    let selectedRoles: Array<{ id: string; name: string }> = [];
    let primaryRole = DEFAULT_ROLE;

    if (resolvedRoleIds.length > 0) {
      const roleRows = await this.db.select().from(roles).where(inArray(roles.id, resolvedRoleIds));
      if (roleRows.length !== resolvedRoleIds.length) {
        throw new NotFoundException('One or more roles were not found');
      }

      selectedRoles = roleRows.map((role) => ({ id: role.id, name: role.name }));
      primaryRole = this.pickPrimaryRole(roleRows.map((role) => role.name));
    }

    await this.db.transaction(async (tx) => {
      const [created] = await tx
        .insert(users)
        .values({
          email,
          passwordHash: params.passwordHash,
          authProvider: 'local',
          googleId: null,
          displayName,
          avatarUrl: null,
          role: primaryRole,
          isActive: params.isActive ?? true,
        })
        .returning();

      if (created?.id && selectedRoles.length > 0) {
        await tx.insert(userRoles).values(
          selectedRoles.map((role) => ({
            userId: created.id,
            roleId: role.id,
          })),
        );
      }
    });

    const createdUserRecord = (await this.findByEmail(email)) as LocalUserRecord | null;

    if (!createdUserRecord) {
      return null;
    }

    return {
      id: createdUserRecord.id,
      email: createdUserRecord.email,
      displayName: createdUserRecord.displayName,
      avatarUrl: createdUserRecord.avatarUrl,
      role: createdUserRecord.role,
      isActive: createdUserRecord.isActive,
      roles: selectedRoles,
    };
  }

  async updatePasswordHash(userId: string, passwordHash: string) {
    const [updated] = await this.db
      .update(users)
      .set({
        passwordHash,
        authProvider: 'local',
        googleId: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    return updated ?? null;
  }

  async updateUserProfile(userId: string, params: { displayName: string }) {
    const displayName = params.displayName.trim();
    if (!displayName) {
      throw new BadRequestException('Display name is required.');
    }

    const [updated] = await this.db
      .update(users)
      .set({
        displayName,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    if (!updated) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    return updated;
  }

  async createPasswordResetToken(params: { userId: string; tokenHash: string; expiresAt: Date }) {
    const [inserted] = await this.db
      .insert(passwordResetTokens)
      .values({
        userId: params.userId,
        tokenHash: params.tokenHash,
        expiresAt: params.expiresAt,
      })
      .returning();

    return inserted ?? null;
  }

  async findValidPasswordResetTokenByHash(tokenHash: string) {
    const now = new Date();
    return this.db.query.passwordResetTokens.findFirst({
      where: and(
        eq(passwordResetTokens.tokenHash, tokenHash),
        isNull(passwordResetTokens.consumedAt),
        gte(passwordResetTokens.expiresAt, now),
      ),
    });
  }

  async consumePasswordResetToken(tokenId: string) {
    const [updated] = await this.db
      .update(passwordResetTokens)
      .set({
        consumedAt: new Date(),
      })
      .where(and(eq(passwordResetTokens.id, tokenId), isNull(passwordResetTokens.consumedAt)))
      .returning();

    return updated ?? null;
  }

  async consumeAllPasswordResetTokensForUser(userId: string) {
    await this.db
      .update(passwordResetTokens)
      .set({ consumedAt: new Date() })
      .where(and(eq(passwordResetTokens.userId, userId), isNull(passwordResetTokens.consumedAt)));
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

    if (filters.authProvider) {
      conditions.push(eq(users.authProvider, filters.authProvider));
    }

    if (filters.createdFrom) {
      conditions.push(gte(users.createdAt, filters.createdFrom));
    }

    if (filters.createdTo) {
      conditions.push(lte(users.createdAt, filters.createdTo));
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
    if (roleNames.includes('agent')) return 'agent';
    if (roleNames.includes('citizen')) return 'citizen';
    return roleNames[0] ?? DEFAULT_ROLE;
  }
}

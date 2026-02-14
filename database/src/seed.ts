import { and, eq } from 'drizzle-orm';
import { createDatabaseInstance } from './client.js';
import { comments, hotels, roles, systemSettings, tickets, userRoles, users } from './schema.js';

type RoleSeed = {
  name: string;
  description: string;
  permissions: string[];
};

type HotelSeed = {
  name: string;
  slug: string;
  isAvailable: boolean;
};

type UserSeed = {
  email: string;
  displayName: string;
  role: string;
  hotelSlug: string;
  assignedRoles: string[];
  isActive: boolean;
  authProvider: 'local' | 'google';
  passwordHash?: string | null;
  googleId?: string | null;
};

type TicketSeed = {
  title: string;
  description: string;
  status: string;
  priority: string;
  requesterEmail: string;
  assigneeEmail: string;
  hotelSlug: string;
};

type CommentSeed = {
  ticketTitle: string;
  authorEmail: string;
  body: string;
};

type SettingSeed = {
  key: string;
  value: unknown;
  description: string;
  isPublic: boolean;
};

const FULL_ADMIN_PERMISSIONS = [
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

const ROLE_SEEDS: RoleSeed[] = [
  {
    name: 'super_admin',
    description: 'Super Administrator',
    permissions: FULL_ADMIN_PERMISSIONS,
  },
  {
    name: 'admin',
    description: 'Administrator',
    permissions: FULL_ADMIN_PERMISSIONS,
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

const HOTEL_SEEDS: HotelSeed[] = [
  { name: 'Default Hotel', slug: 'default-hotel', isAvailable: true },
  { name: 'North Star Hotel', slug: 'north-star-hotel', isAvailable: true },
  { name: 'Sunset Resort', slug: 'sunset-resort', isAvailable: true },
];

const USER_SEEDS: UserSeed[] = [
  {
    email: 'test@ecotrack.local',
    displayName: 'Local Smoke User',
    role: 'agent',
    hotelSlug: 'default-hotel',
    assignedRoles: ['agent'],
    isActive: true,
    authProvider: 'local',
    passwordHash: '$2a$10$a9vsUVq25Tk/tpF4zduryOsGZeimJCpl09DlQGhFdlXA4RVtJwH/u',
    googleId: null,
  },
  {
    email: 'superadmin@example.com',
    displayName: 'Super Admin',
    role: 'super_admin',
    hotelSlug: 'default-hotel',
    assignedRoles: ['super_admin', 'admin'],
    isActive: true,
    authProvider: 'google',
    passwordHash: null,
    googleId: null,
  },
  {
    email: 'admin@example.com',
    displayName: 'Admin User',
    role: 'admin',
    hotelSlug: 'default-hotel',
    assignedRoles: ['admin'],
    isActive: true,
    authProvider: 'google',
    passwordHash: null,
    googleId: null,
  },
  {
    email: 'manager@example.com',
    displayName: 'Manager User',
    role: 'manager',
    hotelSlug: 'north-star-hotel',
    assignedRoles: ['manager'],
    isActive: true,
    authProvider: 'google',
    passwordHash: null,
    googleId: null,
  },
  {
    email: 'agent@example.com',
    displayName: 'Agent User',
    role: 'agent',
    hotelSlug: 'north-star-hotel',
    assignedRoles: ['agent'],
    isActive: true,
    authProvider: 'google',
    passwordHash: null,
    googleId: null,
  },
];

const TICKET_SEEDS: TicketSeed[] = [
  {
    title: 'Leaky faucet in room 101',
    description: 'Bathroom faucet leaks continuously and needs urgent maintenance.',
    status: 'open',
    priority: 'high',
    requesterEmail: 'agent@example.com',
    assigneeEmail: 'manager@example.com',
    hotelSlug: 'north-star-hotel',
  },
  {
    title: 'Air conditioner not cooling',
    description: 'Room 214 AC unit runs but does not cool below 25C.',
    status: 'in_progress',
    priority: 'medium',
    requesterEmail: 'agent@example.com',
    assigneeEmail: 'manager@example.com',
    hotelSlug: 'north-star-hotel',
  },
  {
    title: 'Elevator inspection follow-up',
    description: 'Post-inspection action items need completion confirmation.',
    status: 'completed',
    priority: 'low',
    requesterEmail: 'manager@example.com',
    assigneeEmail: 'manager@example.com',
    hotelSlug: 'default-hotel',
  },
];

const COMMENT_SEEDS: CommentSeed[] = [
  {
    ticketTitle: 'Leaky faucet in room 101',
    authorEmail: 'agent@example.com',
    body: 'Guest reported this issue at front desk. Please prioritize.',
  },
  {
    ticketTitle: 'Air conditioner not cooling',
    authorEmail: 'manager@example.com',
    body: 'Maintenance team scheduled for inspection this afternoon.',
  },
  {
    ticketTitle: 'Elevator inspection follow-up',
    authorEmail: 'manager@example.com',
    body: 'Inspection items completed and documented.',
  },
];

const SETTING_SEEDS: SettingSeed[] = [
  {
    key: 'site_name',
    value: 'Ticket Management System',
    description: 'Site name',
    isPublic: true,
  },
  {
    key: 'site_description',
    value: 'Professional ticket and hotel management platform',
    description: 'Site description',
    isPublic: true,
  },
  {
    key: 'default_user_role',
    value: 'agent',
    description: 'Default role for new users',
    isPublic: false,
  },
  {
    key: 'maintenance_mode',
    value: false,
    description: 'Maintenance mode flag',
    isPublic: false,
  },
];

const CLOSED_STATUSES = new Set(['completed', 'closed']);

export async function seedDatabase() {
  const { db, dispose } = createDatabaseInstance();
  const now = new Date();

  try {
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DATABASE_SEED_IN_PROD !== 'true') {
      throw new Error('Refusing to run database seed in production without ALLOW_DATABASE_SEED_IN_PROD=true');
    }

    await db.transaction(async (tx) => {
      const roleIds = new Map<string, string>();
      for (const seed of ROLE_SEEDS) {
        await tx
        .insert(roles)
        .values({
          name: seed.name,
          description: seed.description,
          permissions: seed.permissions,
        })
        .onConflictDoUpdate({
          target: roles.name,
          set: {
            description: seed.description,
            permissions: seed.permissions,
            updatedAt: now,
          },
        });

        const [row] = await tx.select().from(roles).where(eq(roles.name, seed.name)).limit(1);
        if (!row) {
          throw new Error(`Failed to resolve role: ${seed.name}`);
        }
        roleIds.set(seed.name, row.id);
      }

      const hotelIds = new Map<string, string>();
      for (const seed of HOTEL_SEEDS) {
        await tx
        .insert(hotels)
        .values({
          name: seed.name,
          slug: seed.slug,
          isAvailable: seed.isAvailable,
        })
        .onConflictDoUpdate({
          target: hotels.slug,
          set: {
            name: seed.name,
            isAvailable: seed.isAvailable,
            updatedAt: now,
          },
        });

        const [row] = await tx.select().from(hotels).where(eq(hotels.slug, seed.slug)).limit(1);
        if (!row) {
          throw new Error(`Failed to resolve hotel: ${seed.slug}`);
        }
        hotelIds.set(seed.slug, row.id);
      }

      const userIds = new Map<string, string>();
      for (const seed of USER_SEEDS) {
        const hotelId = hotelIds.get(seed.hotelSlug);
        if (!hotelId) {
          throw new Error(`Hotel not found for user ${seed.email}: ${seed.hotelSlug}`);
        }

        await tx
        .insert(users)
        .values({
          email: seed.email,
          displayName: seed.displayName,
          authProvider: seed.authProvider,
          passwordHash: seed.passwordHash ?? null,
          googleId: seed.googleId ?? null,
          role: seed.role,
          isActive: seed.isActive,
          hotelId,
        })
        .onConflictDoUpdate({
          target: users.email,
          set: {
            displayName: seed.displayName,
            role: seed.role,
            isActive: seed.isActive,
            hotelId,
            updatedAt: now,
          },
        });

        const [row] = await tx.select().from(users).where(eq(users.email, seed.email)).limit(1);
        if (!row) {
          throw new Error(`Failed to resolve user: ${seed.email}`);
        }
        userIds.set(seed.email, row.id);
      }

      for (const userSeed of USER_SEEDS) {
        const userId = userIds.get(userSeed.email);
        if (!userId) {
          throw new Error(`User missing for role assignment: ${userSeed.email}`);
        }

        for (const roleName of userSeed.assignedRoles) {
          const roleId = roleIds.get(roleName);
          if (!roleId) {
            throw new Error(`Role missing for user assignment: ${roleName}`);
          }

          await tx
            .insert(userRoles)
            .values({
              userId,
              roleId,
            })
            .onConflictDoNothing();
        }
      }

      const ticketIds = new Map<string, string>();
      for (const seed of TICKET_SEEDS) {
        const requesterId = userIds.get(seed.requesterEmail);
        const assigneeId = userIds.get(seed.assigneeEmail);
        const hotelId = hotelIds.get(seed.hotelSlug);

        if (!requesterId || !assigneeId || !hotelId) {
          throw new Error(`Missing references for ticket seed: ${seed.title}`);
        }

        const [existing] = await tx
        .select()
        .from(tickets)
        .where(and(eq(tickets.title, seed.title), eq(tickets.requesterId, requesterId)))
        .limit(1);

        if (existing) {
          const closedAtValue = CLOSED_STATUSES.has(seed.status) ? existing.closedAt ?? now : null;

          await tx
            .update(tickets)
            .set({
              description: seed.description,
              status: seed.status,
              priority: seed.priority,
              assigneeId,
              hotelId,
              closedAt: closedAtValue,
              updatedAt: now,
            })
            .where(eq(tickets.id, existing.id));

          ticketIds.set(seed.title, existing.id);
          continue;
        }

        const [inserted] = await tx
          .insert(tickets)
          .values({
            title: seed.title,
            description: seed.description,
            status: seed.status,
            priority: seed.priority,
            requesterId,
            assigneeId,
            hotelId,
            closedAt: CLOSED_STATUSES.has(seed.status) ? now : null,
          })
          .returning({ id: tickets.id });

        if (!inserted) {
          throw new Error(`Failed to create ticket seed: ${seed.title}`);
        }

        ticketIds.set(seed.title, inserted.id);
      }

      for (const seed of COMMENT_SEEDS) {
        const ticketId = ticketIds.get(seed.ticketTitle);
        const authorId = userIds.get(seed.authorEmail);

        if (!ticketId || !authorId) {
          throw new Error(`Missing references for comment seed on ticket: ${seed.ticketTitle}`);
        }

        const [existing] = await tx
        .select()
        .from(comments)
        .where(
          and(
            eq(comments.ticketId, ticketId),
            eq(comments.authorId, authorId),
            eq(comments.body, seed.body),
          ),
        )
        .limit(1);

        if (!existing) {
          await tx.insert(comments).values({
            ticketId,
            authorId,
            body: seed.body,
          });
        }
      }

      for (const seed of SETTING_SEEDS) {
        await tx
        .insert(systemSettings)
        .values({
          key: seed.key,
          value: seed.value,
          description: seed.description,
          isPublic: seed.isPublic,
        })
        .onConflictDoUpdate({
          target: systemSettings.key,
          set: {
            value: seed.value,
            description: seed.description,
            isPublic: seed.isPublic,
            updatedAt: now,
          },
        });
      }
    });
  } finally {
    await dispose();
  }
}

void seedDatabase()
  .then(() => {
    console.info('[seed] Database seeding completed successfully.');
  })
  .catch((error) => {
    console.error('[seed] Database seeding failed.', error);
    process.exitCode = 1;
  });

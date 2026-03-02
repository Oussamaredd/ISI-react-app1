import { and, eq } from 'drizzle-orm';
import { createDatabaseInstance } from './client.js';
import {
  anomalyReports,
  anomalyTypes,
  challengeParticipations,
  challenges,
  citizenReports,
  collectionEvents,
  comments,
  containers,
  gamificationProfiles,
  roles,
  systemSettings,
  tickets,
  tourStops,
  tours,
  userRoles,
  users,
  zones,
} from './schema.js';

type RoleSeed = {
  name: string;
  description: string;
  permissions: string[];
};

type UserSeed = {
  email: string;
  displayName: string;
  role: string;
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

type ZoneSeed = {
  name: string;
  code: string;
  description?: string;
};

type ContainerSeed = {
  code: string;
  label: string;
  status: string;
  fillLevelPercent: number;
  zoneCode: string;
  latitude?: string;
  longitude?: string;
};

type TourSeed = {
  name: string;
  status: string;
  zoneCode: string;
  assignedAgentEmail: string;
  scheduledForOffsetDays: number;
  stopContainerCodes: string[];
};

type CitizenReportSeed = {
  containerCode: string;
  reporterEmail: string;
  status: string;
  description: string;
  latitude?: string;
  longitude?: string;
};

type GamificationProfileSeed = {
  email: string;
  points: number;
  level: number;
  badges: string[];
};

type ChallengeSeed = {
  code: string;
  title: string;
  description: string;
  targetValue: number;
  rewardPoints: number;
  status: string;
};

type ChallengeParticipationSeed = {
  challengeCode: string;
  userEmail: string;
  progress: number;
  status: string;
};

type AnomalyTypeSeed = {
  code: string;
  label: string;
  description: string;
};

type AnomalyReportSeed = {
  anomalyTypeCode: string;
  tourName: string;
  stopOrder: number;
  reporterEmail: string;
  comments: string;
  photoUrl?: string;
  severity: string;
};

const LEGACY_ADMIN_PERMISSIONS = [
  'users.read',
  'users.write',
  'roles.read',
  'roles.write',
  'tickets.read',
  'tickets.write',
  'audit.read',
  'settings.write',
];

const ECOTRACK_ADMIN_PERMISSIONS = [
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

const FULL_ADMIN_PERMISSIONS = [...LEGACY_ADMIN_PERMISSIONS, ...ECOTRACK_ADMIN_PERMISSIONS];

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

const MANUAL_TEST_PASSWORD_HASH = '$2a$10$UQth0tiCN3PWdZN8C8pEeuFJ.6ceJ/MP46cz/TAxZ/r6EFjuifdv2';

const USER_SEEDS: UserSeed[] = [
  {
    email: 'test@ecotrack.local',
    displayName: 'Local Smoke User',
    role: 'agent',
    assignedRoles: ['agent'],
    isActive: true,
    authProvider: 'local',
    passwordHash: MANUAL_TEST_PASSWORD_HASH,
    googleId: null,
  },
  {
    email: 'a@admin.fr',
    displayName: 'EcoTrack Super Admin',
    role: 'super_admin',
    assignedRoles: ['super_admin', 'admin'],
    isActive: true,
    authProvider: 'local',
    passwordHash: MANUAL_TEST_PASSWORD_HASH,
    googleId: null,
  },
  {
    email: 'superadmin@example.com',
    displayName: 'Super Admin',
    role: 'super_admin',
    assignedRoles: ['super_admin', 'admin'],
    isActive: true,
    authProvider: 'local',
    passwordHash: MANUAL_TEST_PASSWORD_HASH,
    googleId: null,
  },
  {
    email: 'admin@example.com',
    displayName: 'Admin User',
    role: 'admin',
    assignedRoles: ['admin'],
    isActive: true,
    authProvider: 'local',
    passwordHash: MANUAL_TEST_PASSWORD_HASH,
    googleId: null,
  },
  {
    email: 'manager@example.com',
    displayName: 'Manager User',
    role: 'manager',
    assignedRoles: ['manager'],
    isActive: true,
    authProvider: 'local',
    passwordHash: MANUAL_TEST_PASSWORD_HASH,
    googleId: null,
  },
  {
    email: 'agent@example.com',
    displayName: 'Agent User',
    role: 'agent',
    assignedRoles: ['agent'],
    isActive: true,
    authProvider: 'local',
    passwordHash: MANUAL_TEST_PASSWORD_HASH,
    googleId: null,
  },
  {
    email: 'citizen@example.com',
    displayName: 'Citizen User',
    role: 'citizen',
    assignedRoles: ['citizen'],
    isActive: true,
    authProvider: 'local',
    passwordHash: MANUAL_TEST_PASSWORD_HASH,
    googleId: null,
  },
];

const TICKET_SEEDS: TicketSeed[] = [
  {
    title: 'Overflow reported in Downtown main square',
    description: 'Container near main square is close to capacity and needs accelerated pickup.',
    status: 'open',
    priority: 'high',
    requesterEmail: 'agent@example.com',
    assigneeEmail: 'manager@example.com',
  },
  {
    title: 'Collection delay on Harbor route',
    description: 'Residents reported delayed collection on Harbor route for two consecutive days.',
    status: 'in_progress',
    priority: 'medium',
    requesterEmail: 'agent@example.com',
    assigneeEmail: 'manager@example.com',
  },
  {
    title: 'Damaged container follow-up',
    description: 'Repair verification for previously damaged container has been completed.',
    status: 'completed',
    priority: 'low',
    requesterEmail: 'manager@example.com',
    assigneeEmail: 'manager@example.com',
  },
];

const COMMENT_SEEDS: CommentSeed[] = [
  {
    ticketTitle: 'Overflow reported in Downtown main square',
    authorEmail: 'agent@example.com',
    body: 'Escalated by field observation and resident feedback. Please prioritize.',
  },
  {
    ticketTitle: 'Collection delay on Harbor route',
    authorEmail: 'manager@example.com',
    body: 'Dispatch updated and timeline communicated to operations.',
  },
  {
    ticketTitle: 'Damaged container follow-up',
    authorEmail: 'manager@example.com',
    body: 'Repair checklist closed and evidence attached.',
  },
];

const SETTING_SEEDS: SettingSeed[] = [
  {
    key: 'site_name',
    value: 'EcoTrack Platform',
    description: 'Site name',
    isPublic: true,
  },
  {
    key: 'site_description',
    value: 'EcoTrack support and operations platform',
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

const ZONE_SEEDS: ZoneSeed[] = [
  {
    name: 'Downtown',
    code: 'ZONE-DOWNTOWN',
    description: 'City center and nearby public squares',
  },
  {
    name: 'Harbor',
    code: 'ZONE-HARBOR',
    description: 'Port and industrial waterfront area',
  },
];

const CONTAINER_SEEDS: ContainerSeed[] = [
  {
    code: 'CTR-1001',
    label: 'Main Square - Glass',
    status: 'available',
    fillLevelPercent: 35,
    zoneCode: 'ZONE-DOWNTOWN',
    latitude: '48.8566',
    longitude: '2.3522',
  },
  {
    code: 'CTR-1002',
    label: 'Library Avenue - Plastic',
    status: 'attention_required',
    fillLevelPercent: 82,
    zoneCode: 'ZONE-DOWNTOWN',
    latitude: '48.8589',
    longitude: '2.3540',
  },
  {
    code: 'CTR-2001',
    label: 'Harbor Gate - Mixed',
    status: 'available',
    fillLevelPercent: 55,
    zoneCode: 'ZONE-HARBOR',
    latitude: '48.8362',
    longitude: '2.3700',
  },
];

const TOUR_SEEDS: TourSeed[] = [
  {
    name: 'Downtown Morning Round',
    status: 'planned',
    zoneCode: 'ZONE-DOWNTOWN',
    assignedAgentEmail: 'agent@example.com',
    scheduledForOffsetDays: 0,
    stopContainerCodes: ['CTR-1002', 'CTR-1001'],
  },
];

const CITIZEN_REPORT_SEEDS: CitizenReportSeed[] = [
  {
    containerCode: 'CTR-1002',
    reporterEmail: 'citizen@example.com',
    status: 'submitted',
    description: 'Container is almost full and lids are hard to close.',
    latitude: '48.8589',
    longitude: '2.3540',
  },
];

const GAMIFICATION_PROFILE_SEEDS: GamificationProfileSeed[] = [
  {
    email: 'citizen@example.com',
    points: 120,
    level: 2,
    badges: ['first_report', 'neighborhood_helper'],
  },
  {
    email: 'agent@example.com',
    points: 45,
    level: 1,
    badges: ['first_collection'],
  },
];

const CHALLENGE_SEEDS: ChallengeSeed[] = [
  {
    code: 'CHL-NEIGHBORHOOD-03',
    title: 'Neighborhood Reporter Sprint',
    description: 'Submit 3 validated neighborhood reports this month.',
    targetValue: 3,
    rewardPoints: 75,
    status: 'active',
  },
  {
    code: 'CHL-SMART-ROUTE-05',
    title: 'Smart Route Support',
    description: 'Report 5 containers before peak overflow windows.',
    targetValue: 5,
    rewardPoints: 120,
    status: 'active',
  },
];

const CHALLENGE_PARTICIPATION_SEEDS: ChallengeParticipationSeed[] = [
  {
    challengeCode: 'CHL-NEIGHBORHOOD-03',
    userEmail: 'citizen@example.com',
    progress: 1,
    status: 'enrolled',
  },
];

const ANOMALY_TYPE_SEEDS: AnomalyTypeSeed[] = [
  {
    code: 'ANOM-BLOCKED-ACCESS',
    label: 'Blocked access',
    description: 'Container cannot be reached due to blocked road or parked vehicles.',
  },
  {
    code: 'ANOM-DAMAGED-CONTAINER',
    label: 'Damaged container',
    description: 'Container or lid appears damaged and requires intervention.',
  },
  {
    code: 'ANOM-SAFETY-RISK',
    label: 'Safety risk',
    description: 'Safety hazard encountered during collection operation.',
  },
];

const ANOMALY_REPORT_SEEDS: AnomalyReportSeed[] = [
  {
    anomalyTypeCode: 'ANOM-BLOCKED-ACCESS',
    tourName: 'Downtown Morning Round',
    stopOrder: 1,
    reporterEmail: 'agent@example.com',
    comments: 'Delivery truck blocked container for 20 minutes.',
    severity: 'medium',
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

      const agentRoleId = roleIds.get('agent');
      if (agentRoleId) {
        const legacyUsers = await tx
          .update(users)
          .set({
            role: 'agent',
            updatedAt: now,
          })
          .where(eq(users.role, 'user'))
          .returning({ id: users.id });

        for (const row of legacyUsers) {
          await tx.delete(userRoles).where(eq(userRoles.userId, row.id));
          await tx
            .insert(userRoles)
            .values({
              userId: row.id,
              roleId: agentRoleId,
            })
            .onConflictDoNothing();
        }
      }

      const userIds = new Map<string, string>();
      for (const seed of USER_SEEDS) {
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
        })
        .onConflictDoUpdate({
          target: users.email,
          set: {
            displayName: seed.displayName,
            authProvider: seed.authProvider,
            passwordHash: seed.passwordHash ?? null,
            googleId: seed.googleId ?? null,
            role: seed.role,
            isActive: seed.isActive,
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

        await tx.delete(userRoles).where(eq(userRoles.userId, userId));

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

        if (!requesterId || !assigneeId) {
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

      const zoneIds = new Map<string, string>();
      for (const seed of ZONE_SEEDS) {
        await tx
          .insert(zones)
          .values({
            name: seed.name,
            code: seed.code,
            description: seed.description ?? null,
            isActive: true,
          })
          .onConflictDoUpdate({
            target: zones.code,
            set: {
              name: seed.name,
              description: seed.description ?? null,
              updatedAt: now,
            },
          });

        const [row] = await tx.select().from(zones).where(eq(zones.code, seed.code)).limit(1);
        if (!row) {
          throw new Error(`Failed to resolve zone: ${seed.code}`);
        }

        zoneIds.set(seed.code, row.id);
      }

      const containerIds = new Map<string, string>();
      for (const seed of CONTAINER_SEEDS) {
        const zoneId = zoneIds.get(seed.zoneCode);
        if (!zoneId) {
          throw new Error(`Zone not found for container ${seed.code}: ${seed.zoneCode}`);
        }

        await tx
          .insert(containers)
          .values({
            code: seed.code,
            label: seed.label,
            status: seed.status,
            fillLevelPercent: seed.fillLevelPercent,
            zoneId,
            latitude: seed.latitude ?? null,
            longitude: seed.longitude ?? null,
          })
          .onConflictDoUpdate({
            target: containers.code,
            set: {
              label: seed.label,
              status: seed.status,
              fillLevelPercent: seed.fillLevelPercent,
              zoneId,
              latitude: seed.latitude ?? null,
              longitude: seed.longitude ?? null,
              updatedAt: now,
            },
          });

        const [row] = await tx.select().from(containers).where(eq(containers.code, seed.code)).limit(1);
        if (!row) {
          throw new Error(`Failed to resolve container: ${seed.code}`);
        }

        containerIds.set(seed.code, row.id);
      }

      for (const seed of TOUR_SEEDS) {
        const zoneId = zoneIds.get(seed.zoneCode);
        const assignedAgentId = userIds.get(seed.assignedAgentEmail);
        if (!zoneId || !assignedAgentId) {
          throw new Error(`Missing references for tour seed: ${seed.name}`);
        }

        const scheduledFor = new Date(now);
        scheduledFor.setDate(now.getDate() + seed.scheduledForOffsetDays);

        const [tourRow] = await tx
          .insert(tours)
          .values({
            name: seed.name,
            status: seed.status,
            zoneId,
            assignedAgentId,
            scheduledFor,
          })
          .onConflictDoNothing()
          .returning({ id: tours.id });

        const resolvedTour =
          tourRow ?? (await tx.select({ id: tours.id }).from(tours).where(eq(tours.name, seed.name)).limit(1))[0];

        if (!resolvedTour) {
          throw new Error(`Failed to resolve tour: ${seed.name}`);
        }

        await tx.delete(tourStops).where(eq(tourStops.tourId, resolvedTour.id));

        for (let index = 0; index < seed.stopContainerCodes.length; index += 1) {
          const containerCode = seed.stopContainerCodes[index];
          const containerId = containerIds.get(containerCode);

          if (!containerId) {
            throw new Error(`Missing container for tour stop: ${containerCode}`);
          }

          await tx.insert(tourStops).values({
            tourId: resolvedTour.id,
            containerId,
            stopOrder: index + 1,
            status: 'pending',
          });
        }
      }

      for (const seed of CITIZEN_REPORT_SEEDS) {
        const containerId = containerIds.get(seed.containerCode);
        const reporterUserId = userIds.get(seed.reporterEmail);

        if (!containerId || !reporterUserId) {
          throw new Error(`Missing references for citizen report seed: ${seed.containerCode}`);
        }

        const [existingReport] = await tx
          .select()
          .from(citizenReports)
          .where(
            and(
              eq(citizenReports.containerId, containerId),
              eq(citizenReports.reporterUserId, reporterUserId),
              eq(citizenReports.description, seed.description),
            ),
          )
          .limit(1);

        if (!existingReport) {
          await tx.insert(citizenReports).values({
            containerId,
            reporterUserId,
            status: seed.status,
            description: seed.description,
            latitude: seed.latitude ?? null,
            longitude: seed.longitude ?? null,
          });
        }
      }

      for (const seed of GAMIFICATION_PROFILE_SEEDS) {
        const userId = userIds.get(seed.email);
        if (!userId) {
          throw new Error(`Missing user for gamification profile seed: ${seed.email}`);
        }

        await tx
          .insert(gamificationProfiles)
          .values({
            userId,
            points: seed.points,
            level: seed.level,
            badges: seed.badges,
            challengeProgress: {},
          })
          .onConflictDoUpdate({
            target: gamificationProfiles.userId,
            set: {
              points: seed.points,
              level: seed.level,
              badges: seed.badges,
              updatedAt: now,
            },
          });
      }

      const challengeIds = new Map<string, string>();
      for (const seed of CHALLENGE_SEEDS) {
        await tx
          .insert(challenges)
          .values({
            code: seed.code,
            title: seed.title,
            description: seed.description,
            targetValue: seed.targetValue,
            rewardPoints: seed.rewardPoints,
            status: seed.status,
          })
          .onConflictDoUpdate({
            target: challenges.code,
            set: {
              title: seed.title,
              description: seed.description,
              targetValue: seed.targetValue,
              rewardPoints: seed.rewardPoints,
              status: seed.status,
              updatedAt: now,
            },
          });

        const [row] = await tx.select().from(challenges).where(eq(challenges.code, seed.code)).limit(1);
        if (!row) {
          throw new Error(`Failed to resolve challenge: ${seed.code}`);
        }

        challengeIds.set(seed.code, row.id);
      }

      for (const seed of CHALLENGE_PARTICIPATION_SEEDS) {
        const challengeId = challengeIds.get(seed.challengeCode);
        const userId = userIds.get(seed.userEmail);

        if (!challengeId || !userId) {
          throw new Error(
            `Missing references for challenge participation seed: ${seed.challengeCode}/${seed.userEmail}`,
          );
        }

        const [existingParticipation] = await tx
          .select()
          .from(challengeParticipations)
          .where(
            and(
              eq(challengeParticipations.challengeId, challengeId),
              eq(challengeParticipations.userId, userId),
            ),
          )
          .limit(1);

        if (existingParticipation) {
          await tx
            .update(challengeParticipations)
            .set({
              progress: seed.progress,
              status: seed.status,
              updatedAt: now,
            })
            .where(eq(challengeParticipations.id, existingParticipation.id));
        } else {
          await tx.insert(challengeParticipations).values({
            challengeId,
            userId,
            progress: seed.progress,
            status: seed.status,
          });
        }
      }

      const anomalyTypeIds = new Map<string, string>();
      for (const seed of ANOMALY_TYPE_SEEDS) {
        await tx
          .insert(anomalyTypes)
          .values({
            code: seed.code,
            label: seed.label,
            description: seed.description,
            isActive: true,
          })
          .onConflictDoUpdate({
            target: anomalyTypes.code,
            set: {
              label: seed.label,
              description: seed.description,
              isActive: true,
              updatedAt: now,
            },
          });

        const [row] = await tx.select().from(anomalyTypes).where(eq(anomalyTypes.code, seed.code)).limit(1);
        if (!row) {
          throw new Error(`Failed to resolve anomaly type: ${seed.code}`);
        }

        anomalyTypeIds.set(seed.code, row.id);
      }

      for (const seed of ANOMALY_REPORT_SEEDS) {
        const anomalyTypeId = anomalyTypeIds.get(seed.anomalyTypeCode);
        const reporterUserId = userIds.get(seed.reporterEmail);

        const [tourRow] = await tx.select().from(tours).where(eq(tours.name, seed.tourName)).limit(1);
        const [stopRow] = tourRow
          ? await tx
              .select()
              .from(tourStops)
              .where(and(eq(tourStops.tourId, tourRow.id), eq(tourStops.stopOrder, seed.stopOrder)))
              .limit(1)
          : [];

        if (!anomalyTypeId || !reporterUserId || !tourRow || !stopRow) {
          throw new Error(`Missing references for anomaly report seed: ${seed.anomalyTypeCode}`);
        }

        const [existingReport] = await tx
          .select()
          .from(anomalyReports)
          .where(
            and(
              eq(anomalyReports.anomalyTypeId, anomalyTypeId),
              eq(anomalyReports.tourStopId, stopRow.id),
              eq(anomalyReports.reporterUserId, reporterUserId),
            ),
          )
          .limit(1);

        if (existingReport) {
          await tx
            .update(anomalyReports)
            .set({
              comments: seed.comments,
              photoUrl: seed.photoUrl ?? null,
              severity: seed.severity,
              updatedAt: now,
            })
            .where(eq(anomalyReports.id, existingReport.id));
        } else {
          await tx.insert(anomalyReports).values({
            anomalyTypeId,
            tourId: tourRow.id,
            tourStopId: stopRow.id,
            reporterUserId,
            comments: seed.comments,
            photoUrl: seed.photoUrl ?? null,
            severity: seed.severity,
            status: 'reported',
          });
        }
      }

      const [firstTourStop] = await tx.select().from(tourStops).limit(1);
      if (firstTourStop) {
        const [existingCollectionEvent] = await tx
          .select()
          .from(collectionEvents)
          .where(eq(collectionEvents.tourStopId, firstTourStop.id))
          .limit(1);

        if (!existingCollectionEvent) {
          await tx.insert(collectionEvents).values({
            tourStopId: firstTourStop.id,
            containerId: firstTourStop.containerId,
            actorUserId: userIds.get('agent@example.com') ?? null,
            volumeLiters: 120,
            notes: 'Seeded initial collection event',
          });
        }
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

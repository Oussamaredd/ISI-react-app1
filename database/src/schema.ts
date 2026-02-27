import { relations } from 'drizzle-orm';
import { boolean, index, integer, jsonb, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash'),
  authProvider: text('auth_provider').default('google').notNull(),
  googleId: text('google_id').unique(),
  displayName: text('display_name').notNull(),
  avatarUrl: text('avatar_url'),
  role: text('role').default('agent').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const passwordResetTokens = pgTable('password_reset_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  consumedAt: timestamp('consumed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const tickets = pgTable(
  'tickets',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    title: text('title').notNull(),
    description: text('description'),
    supportCategory: text('support_category').default('general_help').notNull(),
    status: text('status').default('open').notNull(),
    priority: text('priority').default('medium').notNull(),
    requesterId: uuid('requester_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    assigneeId: uuid('assignee_id').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    closedAt: timestamp('closed_at', { withTimezone: true }),
  },
  (table) => ({
    createdAtIdx: index('tickets_created_at_idx').on(table.createdAt),
    statusCreatedAtIdx: index('tickets_status_created_at_idx').on(table.status, table.createdAt),
    priorityCreatedAtIdx: index('tickets_priority_created_at_idx').on(table.priority, table.createdAt),
    supportCategoryCreatedAtIdx: index('tickets_support_category_created_at_idx').on(
      table.supportCategory,
      table.createdAt,
    ),
    assigneeCreatedAtIdx: index('tickets_assignee_created_at_idx').on(table.assigneeId, table.createdAt),
  }),
);

export const comments = pgTable('comments', {
  id: uuid('id').defaultRandom().primaryKey(),
  ticketId: uuid('ticket_id')
    .notNull()
    .references(() => tickets.id, { onDelete: 'cascade' }),
  authorId: uuid('author_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  body: text('body').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const attachments = pgTable('attachments', {
  id: uuid('id').defaultRandom().primaryKey(),
  ticketId: uuid('ticket_id')
    .notNull()
    .references(() => tickets.id, { onDelete: 'cascade' }),
  fileName: text('file_name').notNull(),
  fileUrl: text('file_url').notNull(),
  contentType: text('content_type'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const zones = pgTable('zones', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  code: text('code').notNull().unique(),
  description: text('description'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const containers = pgTable('containers', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: text('code').notNull().unique(),
  label: text('label').notNull(),
  status: text('status').default('available').notNull(),
  fillLevelPercent: integer('fill_level_percent').default(0).notNull(),
  latitude: text('latitude'),
  longitude: text('longitude'),
  zoneId: uuid('zone_id').references(() => zones.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const tours = pgTable(
  'tours',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    status: text('status').default('planned').notNull(),
    scheduledFor: timestamp('scheduled_for', { withTimezone: true }).notNull(),
    zoneId: uuid('zone_id').references(() => zones.id, { onDelete: 'set null' }),
    assignedAgentId: uuid('assigned_agent_id').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    scheduledForIdx: index('tours_scheduled_for_idx').on(table.scheduledFor),
    zoneScheduledForIdx: index('tours_zone_scheduled_for_idx').on(table.zoneId, table.scheduledFor),
  }),
);

export const tourStops = pgTable('tour_stops', {
  id: uuid('id').defaultRandom().primaryKey(),
  tourId: uuid('tour_id')
    .notNull()
    .references(() => tours.id, { onDelete: 'cascade' }),
  containerId: uuid('container_id')
    .notNull()
    .references(() => containers.id, { onDelete: 'cascade' }),
  stopOrder: integer('stop_order').notNull(),
  status: text('status').default('pending').notNull(),
  eta: timestamp('eta', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const citizenReports = pgTable('citizen_reports', {
  id: uuid('id').defaultRandom().primaryKey(),
  containerId: uuid('container_id').references(() => containers.id, { onDelete: 'set null' }),
  reporterUserId: uuid('reporter_user_id').references(() => users.id, { onDelete: 'set null' }),
  status: text('status').default('submitted').notNull(),
  description: text('description'),
  photoUrl: text('photo_url'),
  latitude: text('latitude'),
  longitude: text('longitude'),
  reportedAt: timestamp('reported_at', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const collectionEvents = pgTable(
  'collection_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tourStopId: uuid('tour_stop_id').references(() => tourStops.id, { onDelete: 'set null' }),
    containerId: uuid('container_id').references(() => containers.id, { onDelete: 'set null' }),
    actorUserId: uuid('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
    volumeLiters: integer('volume_liters'),
    notes: text('notes'),
    latitude: text('latitude'),
    longitude: text('longitude'),
    collectedAt: timestamp('collected_at', { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    collectedAtIdx: index('collection_events_collected_at_idx').on(table.collectedAt),
    containerCollectedAtIdx: index('collection_events_container_collected_at_idx').on(
      table.containerId,
      table.collectedAt,
    ),
  }),
);

export const gamificationProfiles = pgTable('gamification_profiles', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' })
    .unique(),
  points: integer('points').default(0).notNull(),
  level: integer('level').default(1).notNull(),
  badges: jsonb('badges').$type<string[]>().default([]).notNull(),
  challengeProgress: jsonb('challenge_progress').$type<Record<string, unknown>>().default({}).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const challenges = pgTable('challenges', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: text('code').notNull().unique(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  targetValue: integer('target_value').notNull(),
  rewardPoints: integer('reward_points').default(0).notNull(),
  status: text('status').default('active').notNull(),
  startsAt: timestamp('starts_at', { withTimezone: true }),
  endsAt: timestamp('ends_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const challengeParticipations = pgTable('challenge_participations', {
  id: uuid('id').defaultRandom().primaryKey(),
  challengeId: uuid('challenge_id')
    .notNull()
    .references(() => challenges.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  progress: integer('progress').default(0).notNull(),
  status: text('status').default('enrolled').notNull(),
  rewardGrantedAt: timestamp('reward_granted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const anomalyTypes = pgTable('anomaly_types', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: text('code').notNull().unique(),
  label: text('label').notNull(),
  description: text('description'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const anomalyReports = pgTable(
  'anomaly_reports',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    anomalyTypeId: uuid('anomaly_type_id')
      .notNull()
      .references(() => anomalyTypes.id, { onDelete: 'restrict' }),
    tourId: uuid('tour_id').references(() => tours.id, { onDelete: 'set null' }),
    tourStopId: uuid('tour_stop_id').references(() => tourStops.id, { onDelete: 'set null' }),
    reporterUserId: uuid('reporter_user_id').references(() => users.id, { onDelete: 'set null' }),
    comments: text('comments'),
    photoUrl: text('photo_url'),
    severity: text('severity').default('medium').notNull(),
    status: text('status').default('reported').notNull(),
    reportedAt: timestamp('reported_at', { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    reportedAtIdx: index('anomaly_reports_reported_at_idx').on(table.reportedAt),
    anomalyTypeReportedAtIdx: index('anomaly_reports_type_reported_at_idx').on(
      table.anomalyTypeId,
      table.reportedAt,
    ),
  }),
);

export const reportExports = pgTable(
  'report_exports',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    requestedByUserId: uuid('requested_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    periodStart: timestamp('period_start', { withTimezone: true }).notNull(),
    periodEnd: timestamp('period_end', { withTimezone: true }).notNull(),
    selectedKpis: jsonb('selected_kpis').$type<string[]>().default([]).notNull(),
    format: text('format').default('pdf').notNull(),
    status: text('status').default('generated').notNull(),
    sendEmail: boolean('send_email').default(false).notNull(),
    emailTo: text('email_to'),
    fileContent: text('file_content').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    createdAtIdx: index('report_exports_created_at_idx').on(table.createdAt),
    requesterCreatedAtIdx: index('report_exports_requester_created_at_idx').on(
      table.requestedByUserId,
      table.createdAt,
    ),
  }),
);

export const roles = pgTable('roles', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description'),
  permissions: jsonb('permissions').notNull().$type<string[]>().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const userRoles = pgTable(
  'user_roles',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.roleId] }),
  }),
);

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    action: text('action').notNull(),
    resourceType: text('resource_type').notNull(),
    resourceId: text('resource_id'),
    oldValues: jsonb('old_values'),
    newValues: jsonb('new_values'),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    createdAtIdx: index('audit_logs_created_at_idx').on(table.createdAt),
    actionCreatedAtIdx: index('audit_logs_action_created_at_idx').on(table.action, table.createdAt),
    resourceTypeCreatedAtIdx: index('audit_logs_resource_type_created_at_idx').on(
      table.resourceType,
      table.createdAt,
    ),
    userCreatedAtIdx: index('audit_logs_user_created_at_idx').on(table.userId, table.createdAt),
  }),
);

export const systemSettings = pgTable('system_settings', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
  description: text('description'),
  isPublic: boolean('is_public').default(false).notNull(),
  updatedBy: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many, one }) => ({
  assignedTickets: many(tickets, {
    relationName: 'tickets_assigneeId_users_id',
  }),
  requestedTickets: many(tickets, {
    relationName: 'tickets_requesterId_users_id',
  }),
  comments: many(comments),
  userRoles: many(userRoles),
  auditLogs: many(auditLogs),
  updatedSettings: many(systemSettings),
  passwordResetTokens: many(passwordResetTokens),
  assignedTours: many(tours),
  citizenReports: many(citizenReports),
  collectionEvents: many(collectionEvents),
  gamificationProfile: many(gamificationProfiles),
  challengeParticipations: many(challengeParticipations),
  anomalyReports: many(anomalyReports),
  reportExports: many(reportExports),
}));

export const passwordResetTokensRelations = relations(passwordResetTokens, ({ one }) => ({
  user: one(users, {
    fields: [passwordResetTokens.userId],
    references: [users.id],
  }),
}));

export const ticketsRelations = relations(tickets, ({ one, many }) => ({
  requester: one(users, {
    fields: [tickets.requesterId],
    references: [users.id],
    relationName: 'tickets_requesterId_users_id',
  }),
  assignee: one(users, {
    fields: [tickets.assigneeId],
    references: [users.id],
    relationName: 'tickets_assigneeId_users_id',
  }),
  comments: many(comments),
  attachments: many(attachments),
}));

export const zonesRelations = relations(zones, ({ many }) => ({
  containers: many(containers),
  tours: many(tours),
}));

export const containersRelations = relations(containers, ({ many, one }) => ({
  zone: one(zones, {
    fields: [containers.zoneId],
    references: [zones.id],
  }),
  tourStops: many(tourStops),
  citizenReports: many(citizenReports),
  collectionEvents: many(collectionEvents),
}));

export const toursRelations = relations(tours, ({ many, one }) => ({
  zone: one(zones, {
    fields: [tours.zoneId],
    references: [zones.id],
  }),
  assignedAgent: one(users, {
    fields: [tours.assignedAgentId],
    references: [users.id],
  }),
  stops: many(tourStops),
}));

export const tourStopsRelations = relations(tourStops, ({ one, many }) => ({
  tour: one(tours, {
    fields: [tourStops.tourId],
    references: [tours.id],
  }),
  container: one(containers, {
    fields: [tourStops.containerId],
    references: [containers.id],
  }),
  collectionEvents: many(collectionEvents),
  anomalyReports: many(anomalyReports),
}));

export const citizenReportsRelations = relations(citizenReports, ({ one }) => ({
  container: one(containers, {
    fields: [citizenReports.containerId],
    references: [containers.id],
  }),
  reporter: one(users, {
    fields: [citizenReports.reporterUserId],
    references: [users.id],
  }),
}));

export const collectionEventsRelations = relations(collectionEvents, ({ one }) => ({
  tourStop: one(tourStops, {
    fields: [collectionEvents.tourStopId],
    references: [tourStops.id],
  }),
  container: one(containers, {
    fields: [collectionEvents.containerId],
    references: [containers.id],
  }),
  actor: one(users, {
    fields: [collectionEvents.actorUserId],
    references: [users.id],
  }),
}));

export const gamificationProfilesRelations = relations(gamificationProfiles, ({ one }) => ({
  user: one(users, {
    fields: [gamificationProfiles.userId],
    references: [users.id],
  }),
}));

export const challengesRelations = relations(challenges, ({ many }) => ({
  participations: many(challengeParticipations),
}));

export const anomalyTypesRelations = relations(anomalyTypes, ({ many }) => ({
  reports: many(anomalyReports),
}));

export const anomalyReportsRelations = relations(anomalyReports, ({ one }) => ({
  anomalyType: one(anomalyTypes, {
    fields: [anomalyReports.anomalyTypeId],
    references: [anomalyTypes.id],
  }),
  tour: one(tours, {
    fields: [anomalyReports.tourId],
    references: [tours.id],
  }),
  tourStop: one(tourStops, {
    fields: [anomalyReports.tourStopId],
    references: [tourStops.id],
  }),
  reporter: one(users, {
    fields: [anomalyReports.reporterUserId],
    references: [users.id],
  }),
}));

export const reportExportsRelations = relations(reportExports, ({ one }) => ({
  requestedBy: one(users, {
    fields: [reportExports.requestedByUserId],
    references: [users.id],
  }),
}));

export const challengeParticipationsRelations = relations(challengeParticipations, ({ one }) => ({
  challenge: one(challenges, {
    fields: [challengeParticipations.challengeId],
    references: [challenges.id],
  }),
  user: one(users, {
    fields: [challengeParticipations.userId],
    references: [users.id],
  }),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  ticket: one(tickets, {
    fields: [comments.ticketId],
    references: [tickets.id],
  }),
  author: one(users, {
    fields: [comments.authorId],
    references: [users.id],
  }),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
  userRoles: many(userRoles),
}));

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, {
    fields: [userRoles.userId],
    references: [users.id],
  }),
  role: one(roles, {
    fields: [userRoles.roleId],
    references: [roles.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

export const systemSettingsRelations = relations(systemSettings, ({ one }) => ({
  updatedByUser: one(users, {
    fields: [systemSettings.updatedBy],
    references: [users.id],
  }),
}));
export type User = typeof users.$inferSelect;
export type Ticket = typeof tickets.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type Attachment = typeof attachments.$inferSelect;
export type Zone = typeof zones.$inferSelect;
export type Container = typeof containers.$inferSelect;
export type Tour = typeof tours.$inferSelect;
export type TourStop = typeof tourStops.$inferSelect;
export type CitizenReport = typeof citizenReports.$inferSelect;
export type CollectionEvent = typeof collectionEvents.$inferSelect;
export type GamificationProfile = typeof gamificationProfiles.$inferSelect;
export type Challenge = typeof challenges.$inferSelect;
export type ChallengeParticipation = typeof challengeParticipations.$inferSelect;
export type AnomalyType = typeof anomalyTypes.$inferSelect;
export type AnomalyReport = typeof anomalyReports.$inferSelect;
export type ReportExport = typeof reportExports.$inferSelect;
export type Role = typeof roles.$inferSelect;
export type UserRole = typeof userRoles.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type SystemSetting = typeof systemSettings.$inferSelect;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;

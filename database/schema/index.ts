import { relations, sql } from 'drizzle-orm';
import {
  bigserial,
  boolean,
  index,
  integer,
  jsonb,
  pgSchema,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

type RouteGeometryLineString = {
  type: 'LineString';
  coordinates: Array<[number, number]>;
};

type IotRawMeasurementPayload = {
  source: 'iot-ingestion-api';
  schemaVersion: 'v1';
  batchId: string | null;
  measurement: {
    sensorDeviceId: string | null;
    containerId: string | null;
    deviceUid: string;
    measuredAt: string;
    fillLevelPercent: number;
    temperatureC: number | null;
    batteryPercent: number | null;
    signalStrength: number | null;
    measurementQuality: string;
    idempotencyKey: string | null;
  };
};

type IotValidatedMeasurementPayload = {
  sourceEventId: string;
  schemaVersion: 'v1';
  deviceUid: string;
  sensorDeviceId: string | null;
  containerId: string | null;
  measuredAt: string;
  fillLevelPercent: number;
  temperatureC: number | null;
  batteryPercent: number | null;
  signalStrength: number | null;
  measurementQuality: string;
  warningThreshold: number | null;
  criticalThreshold: number | null;
  receivedAt: string;
  processedAt: string;
};

export const authSchema = pgSchema('auth');
export const coreSchema = pgSchema('core');
export const iotSchema = pgSchema('iot');
export const opsSchema = pgSchema('ops');
export const incidentSchema = pgSchema('incident');
export const notifySchema = pgSchema('notify');
export const gameSchema = pgSchema('game');
export const auditSchema = pgSchema('audit');
export const adminSchema = pgSchema('admin');
export const exportSchema = pgSchema('export');
export const supportSchema = pgSchema('support');

export const users = authSchema.table('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash'),
  authProvider: text('auth_provider').default('google').notNull(),
  googleId: text('google_id').unique(),
  displayName: text('display_name').notNull(),
  avatarUrl: text('avatar_url'),
  role: text('role').default('citizen').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const passwordResetTokens = authSchema.table('password_reset_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  consumedAt: timestamp('consumed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const tickets = supportSchema.table(
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

export const comments = supportSchema.table('comments', {
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

export const attachments = supportSchema.table('attachments', {
  id: uuid('id').defaultRandom().primaryKey(),
  ticketId: uuid('ticket_id')
    .notNull()
    .references(() => tickets.id, { onDelete: 'cascade' }),
  fileName: text('file_name').notNull(),
  fileUrl: text('file_url').notNull(),
  contentType: text('content_type'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const zones = coreSchema.table('zones', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  code: text('code').notNull().unique(),
  description: text('description'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const containerTypes = coreSchema.table('container_types', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: text('code').notNull().unique(),
  label: text('label').notNull(),
  wasteStream: text('waste_stream').notNull(),
  nominalCapacityLiters: integer('nominal_capacity_liters'),
  defaultFillAlertPercent: integer('default_fill_alert_percent'),
  defaultCriticalAlertPercent: integer('default_critical_alert_percent'),
  colorCode: text('color_code'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const containers = coreSchema.table('containers', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: text('code').notNull().unique(),
  label: text('label').notNull(),
  status: text('status').default('available').notNull(),
  fillLevelPercent: integer('fill_level_percent').default(0).notNull(),
  latitude: text('latitude'),
  longitude: text('longitude'),
  containerTypeId: uuid('container_type_id').references(() => containerTypes.id, { onDelete: 'set null' }),
  zoneId: uuid('zone_id').references(() => zones.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const sensorDevices = iotSchema.table(
  'sensor_devices',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    containerId: uuid('container_id').references(() => containers.id, { onDelete: 'set null' }),
    deviceUid: text('device_uid').notNull().unique(),
    hardwareModel: text('hardware_model'),
    firmwareVersion: text('firmware_version'),
    installStatus: text('install_status').default('active').notNull(),
    batteryPercent: integer('battery_percent'),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
    installedAt: timestamp('installed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    containerLastSeenIdx: index('sensor_devices_container_last_seen_idx').on(table.containerId, table.lastSeenAt),
  }),
);

export const measurements = iotSchema.table(
  'measurements',
  {
    id: bigserial('id', { mode: 'number' }),
    sensorDeviceId: uuid('sensor_device_id').references(() => sensorDevices.id, { onDelete: 'set null' }),
    containerId: uuid('container_id').references(() => containers.id, { onDelete: 'set null' }),
    measuredAt: timestamp('measured_at', { withTimezone: true }).notNull(),
    fillLevelPercent: integer('fill_level_percent').notNull(),
    temperatureC: integer('temperature_c'),
    batteryPercent: integer('battery_percent'),
    signalStrength: integer('signal_strength'),
    measurementQuality: text('measurement_quality').default('valid').notNull(),
    sourcePayload: jsonb('source_payload').$type<Record<string, unknown>>().default({}).notNull(),
    receivedAt: timestamp('received_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id, table.measuredAt] }),
    containerMeasuredAtIdx: index('measurements_container_measured_at_idx').on(table.containerId, table.measuredAt),
    sensorMeasuredAtIdx: index('measurements_sensor_measured_at_idx').on(table.sensorDeviceId, table.measuredAt),
  }),
);

export const ingestionEvents = iotSchema.table(
  'ingestion_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    batchId: uuid('batch_id'),
    deviceUid: text('device_uid').notNull(),
    sensorDeviceId: uuid('sensor_device_id').references(() => sensorDevices.id, { onDelete: 'set null' }),
    containerId: uuid('container_id').references(() => containers.id, { onDelete: 'set null' }),
    idempotencyKey: text('idempotency_key'),
    measuredAt: timestamp('measured_at', { withTimezone: true }).notNull(),
    fillLevelPercent: integer('fill_level_percent').notNull(),
    temperatureC: integer('temperature_c'),
    batteryPercent: integer('battery_percent'),
    signalStrength: integer('signal_strength'),
    measurementQuality: text('measurement_quality').default('valid').notNull(),
    processingStatus: text('processing_status').default('pending').notNull(),
    attemptCount: integer('attempt_count').default(0).notNull(),
    nextAttemptAt: timestamp('next_attempt_at', { withTimezone: true }).defaultNow().notNull(),
    processingStartedAt: timestamp('processing_started_at', { withTimezone: true }),
    processedAt: timestamp('processed_at', { withTimezone: true }),
    failedAt: timestamp('failed_at', { withTimezone: true }),
    rejectionReason: text('rejection_reason'),
    lastError: text('last_error'),
    processingLatencyMs: integer('processing_latency_ms'),
    rawPayload: jsonb('raw_payload').$type<IotRawMeasurementPayload>().default(sql`'{}'::jsonb`).notNull(),
    normalizedPayload: jsonb('normalized_payload').$type<Record<string, unknown>>(),
    receivedAt: timestamp('received_at', { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    statusNextAttemptIdx: index('ingestion_events_status_next_attempt_idx').on(
      table.processingStatus,
      table.nextAttemptAt,
    ),
    deviceMeasuredAtIdx: index('ingestion_events_device_measured_at_idx').on(
      table.deviceUid,
      table.measuredAt,
    ),
    batchIdx: index('ingestion_events_batch_idx').on(table.batchId),
    deviceIdempotencyIdx: uniqueIndex('ingestion_events_device_idempotency_idx').on(
      table.deviceUid,
      table.idempotencyKey,
    ),
  }),
);

export const validatedMeasurementEvents = iotSchema.table(
  'validated_measurement_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    sourceEventId: uuid('source_event_id')
      .notNull()
      .references(() => ingestionEvents.id, { onDelete: 'cascade' }),
    deviceUid: text('device_uid').notNull(),
    sensorDeviceId: uuid('sensor_device_id').references(() => sensorDevices.id, { onDelete: 'set null' }),
    containerId: uuid('container_id').references(() => containers.id, { onDelete: 'set null' }),
    measuredAt: timestamp('measured_at', { withTimezone: true }).notNull(),
    fillLevelPercent: integer('fill_level_percent').notNull(),
    temperatureC: integer('temperature_c'),
    batteryPercent: integer('battery_percent'),
    signalStrength: integer('signal_strength'),
    measurementQuality: text('measurement_quality').default('valid').notNull(),
    warningThreshold: integer('warning_threshold'),
    criticalThreshold: integer('critical_threshold'),
    validationSummary: jsonb('validation_summary').$type<Record<string, unknown>>().default(sql`'{}'::jsonb`).notNull(),
    normalizedPayload: jsonb('normalized_payload').$type<IotValidatedMeasurementPayload>().default(sql`'{}'::jsonb`).notNull(),
    emittedAt: timestamp('emitted_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    sourceEventIdx: uniqueIndex('validated_measurement_events_source_event_idx').on(table.sourceEventId),
    containerMeasuredAtIdx: index('validated_measurement_events_container_measured_at_idx').on(
      table.containerId,
      table.measuredAt,
    ),
    sensorMeasuredAtIdx: index('validated_measurement_events_sensor_measured_at_idx').on(
      table.sensorDeviceId,
      table.measuredAt,
    ),
  }),
);

export const tours = opsSchema.table(
  'tours',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    status: text('status').default('planned').notNull(),
    scheduledFor: timestamp('scheduled_for', { withTimezone: true }).notNull(),
    zoneId: uuid('zone_id').references(() => zones.id, { onDelete: 'set null' }),
    assignedAgentId: uuid('assigned_agent_id').references(() => users.id, { onDelete: 'set null' }),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    scheduledForIdx: index('tours_scheduled_for_idx').on(table.scheduledFor),
    zoneScheduledForIdx: index('tours_zone_scheduled_for_idx').on(table.zoneId, table.scheduledFor),
  }),
);

export const tourStops = opsSchema.table('tour_stops', {
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

export const tourRoutes = opsSchema.table('tour_routes', {
  id: uuid('id').defaultRandom().primaryKey(),
  tourId: uuid('tour_id')
    .notNull()
    .references(() => tours.id, { onDelete: 'cascade' })
    .unique(),
  geometry: jsonb('geometry').$type<RouteGeometryLineString>().notNull(),
  distanceMeters: integer('distance_meters'),
  durationMinutes: integer('duration_minutes'),
  source: text('source').default('fallback').notNull(),
  provider: text('provider').default('internal').notNull(),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const citizenReports = incidentSchema.table('citizen_reports', {
  id: uuid('id').defaultRandom().primaryKey(),
  containerId: uuid('container_id').references(() => containers.id, { onDelete: 'set null' }),
  containerCodeSnapshot: text('container_code_snapshot'),
  containerLabelSnapshot: text('container_label_snapshot'),
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

export const collectionEvents = opsSchema.table(
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

export const gamificationProfiles = gameSchema.table('gamification_profiles', {
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

export const challenges = gameSchema.table('challenges', {
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

export const challengeParticipations = gameSchema.table('challenge_participations', {
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

export const anomalyTypes = incidentSchema.table('anomaly_types', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: text('code').notNull().unique(),
  label: text('label').notNull(),
  description: text('description'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const anomalyReports = incidentSchema.table(
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

export const reportExports = exportSchema.table(
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

export const roles = authSchema.table('roles', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description'),
  permissions: jsonb('permissions').notNull().$type<string[]>().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const userRoles = authSchema.table(
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

export const auditLogs = auditSchema.table(
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

export const systemSettings = adminSchema.table('system_settings', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
  description: text('description'),
  isPublic: boolean('is_public').default(false).notNull(),
  updatedBy: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const alertRules = adminSchema.table(
  'alert_rules',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    scopeType: text('scope_type').notNull(),
    scopeKey: text('scope_key'),
    warningFillPercent: integer('warning_fill_percent'),
    criticalFillPercent: integer('critical_fill_percent'),
    anomalyTypeCode: text('anomaly_type_code'),
    notifyChannels: jsonb('notify_channels').$type<string[]>().default([]).notNull(),
    recipientRole: text('recipient_role'),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    scopeActiveIdx: index('alert_rules_scope_active_idx').on(table.scopeType, table.isActive),
  }),
);

export const alertEvents = incidentSchema.table(
  'alert_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    ruleId: uuid('rule_id').references(() => alertRules.id, { onDelete: 'set null' }),
    containerId: uuid('container_id').references(() => containers.id, { onDelete: 'set null' }),
    zoneId: uuid('zone_id').references(() => zones.id, { onDelete: 'set null' }),
    eventType: text('event_type').notNull(),
    severity: text('severity').default('warning').notNull(),
    triggeredAt: timestamp('triggered_at', { withTimezone: true }).defaultNow().notNull(),
    currentStatus: text('current_status').default('open').notNull(),
    acknowledgedByUserId: uuid('acknowledged_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    payloadSnapshot: jsonb('payload_snapshot').$type<Record<string, unknown>>().default({}).notNull(),
  },
  (table) => ({
    statusSeverityTriggeredIdx: index('alert_events_status_severity_triggered_idx').on(
      table.currentStatus,
      table.severity,
      table.triggeredAt,
    ),
    containerStatusTriggeredIdx: index('alert_events_container_status_triggered_idx').on(
      table.containerId,
      table.currentStatus,
      table.triggeredAt,
    ),
  }),
);

export const notifications = notifySchema.table(
  'notifications',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    eventType: text('event_type').notNull(),
    entityType: text('entity_type'),
    entityId: text('entity_id'),
    audienceScope: text('audience_scope').notNull(),
    title: text('title').notNull(),
    body: text('body').notNull(),
    preferredChannels: jsonb('preferred_channels').$type<string[]>().default([]).notNull(),
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }).defaultNow().notNull(),
    status: text('status').default('queued').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    statusScheduledIdx: index('notifications_status_scheduled_idx').on(table.status, table.scheduledAt),
  }),
);

export const notificationDeliveries = notifySchema.table(
  'notification_deliveries',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    notificationId: uuid('notification_id')
      .notNull()
      .references(() => notifications.id, { onDelete: 'cascade' }),
    channel: text('channel').notNull(),
    recipientAddress: text('recipient_address').notNull(),
    providerMessageId: text('provider_message_id'),
    deliveryStatus: text('delivery_status').default('pending').notNull(),
    attemptCount: integer('attempt_count').default(0).notNull(),
    lastAttemptAt: timestamp('last_attempt_at', { withTimezone: true }),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }),
    errorCode: text('error_code'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    channelStatusAttemptIdx: index('notification_deliveries_channel_status_attempt_idx').on(
      table.channel,
      table.deliveryStatus,
      table.lastAttemptAt,
    ),
  }),
);

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
  acknowledgedAlerts: many(alertEvents, {
    relationName: 'alert_events_acknowledgedByUserId_users_id',
  }),
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
  alertEvents: many(alertEvents),
}));

export const containerTypesRelations = relations(containerTypes, ({ many }) => ({
  containers: many(containers),
}));

export const containersRelations = relations(containers, ({ many, one }) => ({
  containerType: one(containerTypes, {
    fields: [containers.containerTypeId],
    references: [containerTypes.id],
  }),
  zone: one(zones, {
    fields: [containers.zoneId],
    references: [zones.id],
  }),
  tourStops: many(tourStops),
  citizenReports: many(citizenReports),
  collectionEvents: many(collectionEvents),
  sensorDevices: many(sensorDevices),
  measurements: many(measurements),
  ingestionEvents: many(ingestionEvents),
  validatedMeasurementEvents: many(validatedMeasurementEvents),
  alertEvents: many(alertEvents),
}));

export const sensorDevicesRelations = relations(sensorDevices, ({ many, one }) => ({
  container: one(containers, {
    fields: [sensorDevices.containerId],
    references: [containers.id],
  }),
  measurements: many(measurements),
  ingestionEvents: many(ingestionEvents),
  validatedMeasurementEvents: many(validatedMeasurementEvents),
}));

export const measurementsRelations = relations(measurements, ({ one }) => ({
  sensorDevice: one(sensorDevices, {
    fields: [measurements.sensorDeviceId],
    references: [sensorDevices.id],
  }),
  container: one(containers, {
    fields: [measurements.containerId],
    references: [containers.id],
  }),
}));

export const ingestionEventsRelations = relations(ingestionEvents, ({ many, one }) => ({
  sensorDevice: one(sensorDevices, {
    fields: [ingestionEvents.sensorDeviceId],
    references: [sensorDevices.id],
  }),
  container: one(containers, {
    fields: [ingestionEvents.containerId],
    references: [containers.id],
  }),
  validatedEvents: many(validatedMeasurementEvents),
}));

export const validatedMeasurementEventsRelations = relations(validatedMeasurementEvents, ({ one }) => ({
  sourceEvent: one(ingestionEvents, {
    fields: [validatedMeasurementEvents.sourceEventId],
    references: [ingestionEvents.id],
  }),
  sensorDevice: one(sensorDevices, {
    fields: [validatedMeasurementEvents.sensorDeviceId],
    references: [sensorDevices.id],
  }),
  container: one(containers, {
    fields: [validatedMeasurementEvents.containerId],
    references: [containers.id],
  }),
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
  routeRecords: many(tourRoutes),
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

export const tourRoutesRelations = relations(tourRoutes, ({ one }) => ({
  tour: one(tours, {
    fields: [tourRoutes.tourId],
    references: [tours.id],
  }),
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

export const alertRulesRelations = relations(alertRules, ({ many }) => ({
  events: many(alertEvents),
}));

export const alertEventsRelations = relations(alertEvents, ({ one }) => ({
  rule: one(alertRules, {
    fields: [alertEvents.ruleId],
    references: [alertRules.id],
  }),
  container: one(containers, {
    fields: [alertEvents.containerId],
    references: [containers.id],
  }),
  zone: one(zones, {
    fields: [alertEvents.zoneId],
    references: [zones.id],
  }),
  acknowledgedBy: one(users, {
    fields: [alertEvents.acknowledgedByUserId],
    references: [users.id],
    relationName: 'alert_events_acknowledgedByUserId_users_id',
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

export const notificationsRelations = relations(notifications, ({ many }) => ({
  deliveries: many(notificationDeliveries),
}));

export const notificationDeliveriesRelations = relations(notificationDeliveries, ({ one }) => ({
  notification: one(notifications, {
    fields: [notificationDeliveries.notificationId],
    references: [notifications.id],
  }),
}));
export type User = typeof users.$inferSelect;
export type Ticket = typeof tickets.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type Attachment = typeof attachments.$inferSelect;
export type Zone = typeof zones.$inferSelect;
export type ContainerType = typeof containerTypes.$inferSelect;
export type Container = typeof containers.$inferSelect;
export type SensorDevice = typeof sensorDevices.$inferSelect;
export type Measurement = typeof measurements.$inferSelect;
export type IngestionEvent = typeof ingestionEvents.$inferSelect;
export type ValidatedMeasurementEvent = typeof validatedMeasurementEvents.$inferSelect;
export type Tour = typeof tours.$inferSelect;
export type TourStop = typeof tourStops.$inferSelect;
export type TourRoute = typeof tourRoutes.$inferSelect;
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
export type AlertRule = typeof alertRules.$inferSelect;
export type AlertEvent = typeof alertEvents.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type NotificationDelivery = typeof notificationDeliveries.$inferSelect;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;

import { and, asc, eq } from 'drizzle-orm';
import { createDatabaseInstance } from '../client.js';
import {
  alertEvents,
  alertRules,
  anomalyReports,
  anomalyTypes,
  challengeParticipations,
  challenges,
  citizenReports,
  collectionEvents,
  comments,
  containerTypes,
  containers,
  gamificationProfiles,
  measurements,
  notificationDeliveries,
  notifications,
  roles,
  sensorDevices,
  systemSettings,
  tickets,
  tourRoutes,
  tourStops,
  tours,
  userRoles,
  users,
  zones,
} from '../schema/index.js';

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
  containerTypeCode: string;
  latitude?: string;
  longitude?: string;
};

type ContainerTypeSeed = {
  code: string;
  label: string;
  wasteStream: string;
  nominalCapacityLiters: number;
  defaultFillAlertPercent: number;
  defaultCriticalAlertPercent: number;
  colorCode: string;
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

type SensorDeviceSeed = {
  containerCode: string;
  deviceUid: string;
  hardwareModel: string;
  firmwareVersion: string;
  installStatus: string;
  batteryPercent: number;
  lastSeenAt: string;
  installedAt: string;
};

type MeasurementSeed = {
  deviceUid: string;
  containerCode: string;
  measuredAt: string;
  fillLevelPercent: number;
  temperatureC: number;
  batteryPercent: number;
  signalStrength: number;
  measurementQuality: string;
};

type AlertRuleSeed = {
  scopeType: string;
  scopeKey?: string | null;
  warningFillPercent?: number | null;
  criticalFillPercent?: number | null;
  anomalyTypeCode?: string | null;
  notifyChannels: string[];
  recipientRole?: string | null;
  isActive: boolean;
};

type AlertEventSeed = {
  ruleScopeType?: string | null;
  ruleScopeKey?: string | null;
  containerCode?: string | null;
  zoneCode?: string | null;
  eventType: string;
  severity: string;
  currentStatus: string;
  acknowledgedByEmail?: string | null;
  payloadSnapshot: Record<string, unknown>;
};

type NotificationSeed = {
  eventType: string;
  entityType: string;
  entityId: string;
  audienceScope: string;
  title: string;
  body: string;
  preferredChannels: string[];
  status: string;
  deliveries: Array<{
    channel: string;
    recipientAddress: string;
    deliveryStatus: string;
    attemptCount: number;
  }>;
};

type RouteGeometryLineString = {
  type: 'LineString';
  coordinates: Array<[number, number]>;
};

type PersistedRouteSeed = {
  geometry: RouteGeometryLineString;
  distanceMeters: number | null;
  durationMinutes: number | null;
  source: 'fallback';
  provider: 'seed';
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
    value: 'citizen',
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

const CONTAINER_TYPE_SEEDS: ContainerTypeSeed[] = [
  {
    code: 'glass',
    label: 'Glass',
    wasteStream: 'glass',
    nominalCapacityLiters: 1000,
    defaultFillAlertPercent: 70,
    defaultCriticalAlertPercent: 90,
    colorCode: '#457B9D',
  },
  {
    code: 'recyclables',
    label: 'Recyclables',
    wasteStream: 'recyclable',
    nominalCapacityLiters: 1000,
    defaultFillAlertPercent: 75,
    defaultCriticalAlertPercent: 90,
    colorCode: '#2A9D8F',
  },
  {
    code: 'general_mixed',
    label: 'General Mixed Waste',
    wasteStream: 'mixed',
    nominalCapacityLiters: 1000,
    defaultFillAlertPercent: 80,
    defaultCriticalAlertPercent: 95,
    colorCode: '#4F5D75',
  },
];

const CONTAINER_SEEDS: ContainerSeed[] = [
  {
    code: 'CTR-1001',
    label: 'Main Square - Glass',
    status: 'available',
    fillLevelPercent: 35,
    zoneCode: 'ZONE-DOWNTOWN',
    containerTypeCode: 'glass',
    latitude: '48.8566',
    longitude: '2.3522',
  },
  {
    code: 'CTR-1002',
    label: 'Library Avenue - Plastic',
    status: 'attention_required',
    fillLevelPercent: 82,
    zoneCode: 'ZONE-DOWNTOWN',
    containerTypeCode: 'recyclables',
    latitude: '48.8589',
    longitude: '2.3540',
  },
  {
    code: 'CTR-1003',
    label: 'Central Park North - Paper',
    status: 'available',
    fillLevelPercent: 45,
    zoneCode: 'ZONE-DOWNTOWN',
    containerTypeCode: 'recyclables',
    latitude: '48.8600',
    longitude: '2.3500',
  },
  {
    code: 'CTR-1004',
    label: 'Market Street - Mixed',
    status: 'available',
    fillLevelPercent: 60,
    zoneCode: 'ZONE-DOWNTOWN',
    containerTypeCode: 'general_mixed',
    latitude: '48.8550',
    longitude: '2.3550',
  },
  {
    code: 'CTR-1005',
    label: 'Town Hall - Glass',
    status: 'available',
    fillLevelPercent: 25,
    zoneCode: 'ZONE-DOWNTOWN',
    containerTypeCode: 'glass',
    latitude: '48.8575',
    longitude: '2.3480',
  },
  {
    code: 'CTR-1006',
    label: 'School Zone - Recyclables',
    status: 'attention_required',
    fillLevelPercent: 78,
    zoneCode: 'ZONE-DOWNTOWN',
    containerTypeCode: 'recyclables',
    latitude: '48.8590',
    longitude: '2.3560',
  },
  {
    code: 'CTR-1007',
    label: 'Church Square - Mixed',
    status: 'available',
    fillLevelPercent: 50,
    zoneCode: 'ZONE-DOWNTOWN',
    containerTypeCode: 'general_mixed',
    latitude: '48.8540',
    longitude: '2.3510',
  },
  {
    code: 'CTR-1008',
    label: 'Bus Terminal - Glass',
    status: 'available',
    fillLevelPercent: 40,
    zoneCode: 'ZONE-DOWNTOWN',
    containerTypeCode: 'glass',
    latitude: '48.8610',
    longitude: '2.3530',
  },
  {
    code: 'CTR-1009',
    label: 'Restaurant Row - Mixed',
    status: 'attention_required',
    fillLevelPercent: 88,
    zoneCode: 'ZONE-DOWNTOWN',
    containerTypeCode: 'general_mixed',
    latitude: '48.8560',
    longitude: '2.3570',
  },
  {
    code: 'CTR-1010',
    label: 'Post Office - Recyclables',
    status: 'available',
    fillLevelPercent: 30,
    zoneCode: 'ZONE-DOWNTOWN',
    containerTypeCode: 'recyclables',
    latitude: '48.8580',
    longitude: '2.3460',
  },
  {
    code: 'CTR-2001',
    label: 'Harbor Gate - Mixed',
    status: 'available',
    fillLevelPercent: 55,
    zoneCode: 'ZONE-HARBOR',
    containerTypeCode: 'general_mixed',
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

const SENSOR_DEVICE_SEEDS: SensorDeviceSeed[] = [
  {
    containerCode: 'CTR-1001',
    deviceUid: 'sensor-ctr-1001',
    hardwareModel: 'EcoSense-A1',
    firmwareVersion: '1.2.0',
    installStatus: 'active',
    batteryPercent: 88,
    lastSeenAt: '2026-03-03T08:00:00.000Z',
    installedAt: '2026-02-15T09:00:00.000Z',
  },
  {
    containerCode: 'CTR-1002',
    deviceUid: 'sensor-ctr-1002',
    hardwareModel: 'EcoSense-A1',
    firmwareVersion: '1.2.1',
    installStatus: 'active',
    batteryPercent: 61,
    lastSeenAt: '2026-03-03T08:05:00.000Z',
    installedAt: '2026-02-16T09:00:00.000Z',
  },
  {
    containerCode: 'CTR-1003',
    deviceUid: 'sensor-ctr-1003',
    hardwareModel: 'EcoSense-A1',
    firmwareVersion: '1.2.0',
    installStatus: 'active',
    batteryPercent: 92,
    lastSeenAt: '2026-03-03T08:10:00.000Z',
    installedAt: '2026-02-17T09:00:00.000Z',
  },
  {
    containerCode: 'CTR-1004',
    deviceUid: 'sensor-ctr-1004',
    hardwareModel: 'EcoSense-A1',
    firmwareVersion: '1.2.1',
    installStatus: 'active',
    batteryPercent: 75,
    lastSeenAt: '2026-03-03T08:15:00.000Z',
    installedAt: '2026-02-18T09:00:00.000Z',
  },
  {
    containerCode: 'CTR-1005',
    deviceUid: 'sensor-ctr-1005',
    hardwareModel: 'EcoSense-A1',
    firmwareVersion: '1.2.0',
    installStatus: 'active',
    batteryPercent: 95,
    lastSeenAt: '2026-03-03T08:20:00.000Z',
    installedAt: '2026-02-19T09:00:00.000Z',
  },
  {
    containerCode: 'CTR-1006',
    deviceUid: 'sensor-ctr-1006',
    hardwareModel: 'EcoSense-A1',
    firmwareVersion: '1.2.1',
    installStatus: 'active',
    batteryPercent: 55,
    lastSeenAt: '2026-03-03T08:25:00.000Z',
    installedAt: '2026-02-20T09:00:00.000Z',
  },
  {
    containerCode: 'CTR-1007',
    deviceUid: 'sensor-ctr-1007',
    hardwareModel: 'EcoSense-A1',
    firmwareVersion: '1.2.0',
    installStatus: 'active',
    batteryPercent: 80,
    lastSeenAt: '2026-03-03T08:30:00.000Z',
    installedAt: '2026-02-21T09:00:00.000Z',
  },
  {
    containerCode: 'CTR-1008',
    deviceUid: 'sensor-ctr-1008',
    hardwareModel: 'EcoSense-A1',
    firmwareVersion: '1.2.1',
    installStatus: 'active',
    batteryPercent: 68,
    lastSeenAt: '2026-03-03T08:35:00.000Z',
    installedAt: '2026-02-22T09:00:00.000Z',
  },
  {
    containerCode: 'CTR-1009',
    deviceUid: 'sensor-ctr-1009',
    hardwareModel: 'EcoSense-A1',
    firmwareVersion: '1.2.0',
    installStatus: 'active',
    batteryPercent: 42,
    lastSeenAt: '2026-03-03T08:40:00.000Z',
    installedAt: '2026-02-23T09:00:00.000Z',
  },
  {
    containerCode: 'CTR-1010',
    deviceUid: 'sensor-ctr-1010',
    hardwareModel: 'EcoSense-A1',
    firmwareVersion: '1.2.1',
    installStatus: 'active',
    batteryPercent: 90,
    lastSeenAt: '2026-03-03T08:45:00.000Z',
    installedAt: '2026-02-24T09:00:00.000Z',
  },
  {
    containerCode: 'CTR-2001',
    deviceUid: 'sensor-ctr-2001',
    hardwareModel: 'EcoSense-B2',
    firmwareVersion: '2.0.0',
    installStatus: 'maintenance',
    batteryPercent: 48,
    lastSeenAt: '2026-03-02T22:00:00.000Z',
    installedAt: '2026-02-18T09:00:00.000Z',
  },
];

const MEASUREMENT_SEEDS: MeasurementSeed[] = [
  {
    deviceUid: 'sensor-ctr-1001',
    containerCode: 'CTR-1001',
    measuredAt: '2026-03-03T07:45:00.000Z',
    fillLevelPercent: 38,
    temperatureC: 21,
    batteryPercent: 88,
    signalStrength: -67,
    measurementQuality: 'valid',
  },
  {
    deviceUid: 'sensor-ctr-1002',
    containerCode: 'CTR-1002',
    measuredAt: '2026-03-03T07:50:00.000Z',
    fillLevelPercent: 84,
    temperatureC: 23,
    batteryPercent: 61,
    signalStrength: -71,
    measurementQuality: 'valid',
  },
  {
    deviceUid: 'sensor-ctr-1003',
    containerCode: 'CTR-1003',
    measuredAt: '2026-03-03T07:55:00.000Z',
    fillLevelPercent: 48,
    temperatureC: 20,
    batteryPercent: 92,
    signalStrength: -65,
    measurementQuality: 'valid',
  },
  {
    deviceUid: 'sensor-ctr-1004',
    containerCode: 'CTR-1004',
    measuredAt: '2026-03-03T08:00:00.000Z',
    fillLevelPercent: 62,
    temperatureC: 22,
    batteryPercent: 75,
    signalStrength: -68,
    measurementQuality: 'valid',
  },
  {
    deviceUid: 'sensor-ctr-1005',
    containerCode: 'CTR-1005',
    measuredAt: '2026-03-03T08:05:00.000Z',
    fillLevelPercent: 28,
    temperatureC: 19,
    batteryPercent: 95,
    signalStrength: -63,
    measurementQuality: 'valid',
  },
  {
    deviceUid: 'sensor-ctr-1006',
    containerCode: 'CTR-1006',
    measuredAt: '2026-03-03T08:10:00.000Z',
    fillLevelPercent: 80,
    temperatureC: 24,
    batteryPercent: 55,
    signalStrength: -72,
    measurementQuality: 'valid',
  },
  {
    deviceUid: 'sensor-ctr-1007',
    containerCode: 'CTR-1007',
    measuredAt: '2026-03-03T08:15:00.000Z',
    fillLevelPercent: 52,
    temperatureC: 21,
    batteryPercent: 80,
    signalStrength: -69,
    measurementQuality: 'valid',
  },
  {
    deviceUid: 'sensor-ctr-1008',
    containerCode: 'CTR-1008',
    measuredAt: '2026-03-03T08:20:00.000Z',
    fillLevelPercent: 42,
    temperatureC: 20,
    batteryPercent: 68,
    signalStrength: -70,
    measurementQuality: 'valid',
  },
  {
    deviceUid: 'sensor-ctr-1009',
    containerCode: 'CTR-1009',
    measuredAt: '2026-03-03T08:25:00.000Z',
    fillLevelPercent: 90,
    temperatureC: 25,
    batteryPercent: 42,
    signalStrength: -74,
    measurementQuality: 'valid',
  },
  {
    deviceUid: 'sensor-ctr-1010',
    containerCode: 'CTR-1010',
    measuredAt: '2026-03-03T08:30:00.000Z',
    fillLevelPercent: 32,
    temperatureC: 18,
    batteryPercent: 90,
    signalStrength: -66,
    measurementQuality: 'valid',
  },
  {
    deviceUid: 'sensor-ctr-2001',
    containerCode: 'CTR-2001',
    measuredAt: '2026-03-02T21:45:00.000Z',
    fillLevelPercent: 57,
    temperatureC: 19,
    batteryPercent: 48,
    signalStrength: -79,
    measurementQuality: 'suspect',
  },
];

const ALERT_RULE_SEEDS: AlertRuleSeed[] = [
  {
    scopeType: 'global',
    scopeKey: null,
    warningFillPercent: 80,
    criticalFillPercent: 95,
    anomalyTypeCode: null,
    notifyChannels: ['email'],
    recipientRole: 'manager',
    isActive: true,
  },
  {
    scopeType: 'container_type',
    scopeKey: 'recyclables',
    warningFillPercent: 75,
    criticalFillPercent: 90,
    anomalyTypeCode: null,
    notifyChannels: ['email', 'push'],
    recipientRole: 'manager',
    isActive: true,
  },
];

const ALERT_EVENT_SEEDS: AlertEventSeed[] = [
  {
    ruleScopeType: 'container_type',
    ruleScopeKey: 'recyclables',
    containerCode: 'CTR-1002',
    zoneCode: 'ZONE-DOWNTOWN',
    eventType: 'fill_threshold_exceeded',
    severity: 'warning',
    currentStatus: 'open',
    acknowledgedByEmail: null,
    payloadSnapshot: {
      fillLevelPercent: 84,
      measuredAt: '2026-03-03T07:50:00.000Z',
    },
  },
];

const NOTIFICATION_SEEDS: NotificationSeed[] = [
  {
    eventType: 'seed.alert_raised',
    entityType: 'alert_event',
    entityId: 'seed-fill-threshold-ctr-1002',
    audienceScope: 'role:manager',
    title: 'Container nearing capacity',
    body: 'CTR-1002 has crossed the warning threshold.',
    preferredChannels: ['email'],
    status: 'sent',
    deliveries: [
      {
        channel: 'email',
        recipientAddress: 'ops@example.com',
        deliveryStatus: 'delivered',
        attemptCount: 1,
      },
    ],
  },
];

const CLOSED_STATUSES = new Set(['completed', 'closed']);
const EARTH_RADIUS_KM = 6371;
const AVERAGE_ROUTE_SPEED_KMH = 24;
const STOP_SERVICE_DURATION_MINUTES = 4;

const toNumberOrNull = (value: unknown) => {
  if (value == null) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toRadians = (value: number) => (value * Math.PI) / 180;

const haversineDistanceKm = (
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
) => {
  const dLat = toRadians(to.latitude - from.latitude);
  const dLng = toRadians(to.longitude - from.longitude);
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
};

const buildPersistedRouteSeed = (
  stops: Array<{ stopOrder: number; latitude: string | null; longitude: string | null }>,
): PersistedRouteSeed | null => {
  const normalizedStops = stops
    .map((stop) => {
      const latitude = toNumberOrNull(stop.latitude);
      const longitude = toNumberOrNull(stop.longitude);

      if (latitude == null || longitude == null) {
        return null;
      }

      return {
        stopOrder: stop.stopOrder,
        latitude,
        longitude,
      };
    })
    .filter(
      (
        stop,
      ): stop is {
        stopOrder: number;
        latitude: number;
        longitude: number;
      } => stop != null,
    )
    .sort((left, right) => left.stopOrder - right.stopOrder);

  if (normalizedStops.length === 0) {
    return null;
  }

  let totalDistanceKm = 0;
  for (let index = 1; index < normalizedStops.length; index += 1) {
    totalDistanceKm += haversineDistanceKm(normalizedStops[index - 1], normalizedStops[index]);
  }

  return {
    geometry: {
      type: 'LineString',
      coordinates:
        normalizedStops.length === 1
          ? [
              [normalizedStops[0].longitude, normalizedStops[0].latitude],
              [normalizedStops[0].longitude, normalizedStops[0].latitude],
            ]
          : normalizedStops.map((stop) => [stop.longitude, stop.latitude]),
    },
    distanceMeters: Math.max(0, Math.round(totalDistanceKm * 1000)),
    durationMinutes: Math.max(
      STOP_SERVICE_DURATION_MINUTES,
      Math.round(
        (totalDistanceKm / AVERAGE_ROUTE_SPEED_KMH) * 60 +
          normalizedStops.length * STOP_SERVICE_DURATION_MINUTES,
      ),
    ),
    source: 'fallback',
    provider: 'seed',
  };
};

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

      const citizenRoleId = roleIds.get('citizen');
      if (citizenRoleId) {
        const legacyUsers = await tx
          .update(users)
          .set({
            role: 'citizen',
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
              roleId: citizenRoleId,
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

      const containerTypeIds = new Map<string, string>();
      for (const seed of CONTAINER_TYPE_SEEDS) {
        await tx
          .insert(containerTypes)
          .values({
            code: seed.code,
            label: seed.label,
            wasteStream: seed.wasteStream,
            nominalCapacityLiters: seed.nominalCapacityLiters,
            defaultFillAlertPercent: seed.defaultFillAlertPercent,
            defaultCriticalAlertPercent: seed.defaultCriticalAlertPercent,
            colorCode: seed.colorCode,
            isActive: true,
          })
          .onConflictDoUpdate({
            target: containerTypes.code,
            set: {
              label: seed.label,
              wasteStream: seed.wasteStream,
              nominalCapacityLiters: seed.nominalCapacityLiters,
              defaultFillAlertPercent: seed.defaultFillAlertPercent,
              defaultCriticalAlertPercent: seed.defaultCriticalAlertPercent,
              colorCode: seed.colorCode,
              isActive: true,
              updatedAt: now,
            },
          });

        const [row] = await tx
          .select()
          .from(containerTypes)
          .where(eq(containerTypes.code, seed.code))
          .limit(1);
        if (!row) {
          throw new Error(`Failed to resolve container type: ${seed.code}`);
        }

        containerTypeIds.set(seed.code, row.id);
      }

      const containerIds = new Map<string, string>();
      for (const seed of CONTAINER_SEEDS) {
        const zoneId = zoneIds.get(seed.zoneCode);
        const containerTypeId = containerTypeIds.get(seed.containerTypeCode);
        if (!zoneId) {
          throw new Error(`Zone not found for container ${seed.code}: ${seed.zoneCode}`);
        }
        if (!containerTypeId) {
          throw new Error(`Container type not found for container ${seed.code}: ${seed.containerTypeCode}`);
        }

        await tx
          .insert(containers)
          .values({
            code: seed.code,
            label: seed.label,
            status: seed.status,
            fillLevelPercent: seed.fillLevelPercent,
            zoneId,
            containerTypeId,
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
              containerTypeId,
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

      const sensorDeviceIds = new Map<string, string>();
      for (const seed of SENSOR_DEVICE_SEEDS) {
        const containerId = containerIds.get(seed.containerCode);
        if (!containerId) {
          throw new Error(`Container not found for sensor device ${seed.deviceUid}: ${seed.containerCode}`);
        }

        await tx
          .insert(sensorDevices)
          .values({
            containerId,
            deviceUid: seed.deviceUid,
            hardwareModel: seed.hardwareModel,
            firmwareVersion: seed.firmwareVersion,
            installStatus: seed.installStatus,
            batteryPercent: seed.batteryPercent,
            lastSeenAt: new Date(seed.lastSeenAt),
            installedAt: new Date(seed.installedAt),
          })
          .onConflictDoUpdate({
            target: sensorDevices.deviceUid,
            set: {
              containerId,
              hardwareModel: seed.hardwareModel,
              firmwareVersion: seed.firmwareVersion,
              installStatus: seed.installStatus,
              batteryPercent: seed.batteryPercent,
              lastSeenAt: new Date(seed.lastSeenAt),
              installedAt: new Date(seed.installedAt),
              updatedAt: now,
            },
          });

        const [row] = await tx
          .select()
          .from(sensorDevices)
          .where(eq(sensorDevices.deviceUid, seed.deviceUid))
          .limit(1);
        if (!row) {
          throw new Error(`Failed to resolve sensor device: ${seed.deviceUid}`);
        }

        sensorDeviceIds.set(seed.deviceUid, row.id);
      }

      for (const seed of MEASUREMENT_SEEDS) {
        const sensorDeviceId = sensorDeviceIds.get(seed.deviceUid);
        const containerId = containerIds.get(seed.containerCode);

        if (!sensorDeviceId || !containerId) {
          throw new Error(`Missing references for measurement seed: ${seed.deviceUid}/${seed.containerCode}`);
        }

        const measuredAt = new Date(seed.measuredAt);
        const [existingMeasurement] = await tx
          .select({
            id: measurements.id,
            measuredAt: measurements.measuredAt,
          })
          .from(measurements)
          .where(and(eq(measurements.sensorDeviceId, sensorDeviceId), eq(measurements.measuredAt, measuredAt)))
          .limit(1);

        if (!existingMeasurement) {
          await tx.insert(measurements).values({
            sensorDeviceId,
            containerId,
            measuredAt,
            fillLevelPercent: seed.fillLevelPercent,
            temperatureC: seed.temperatureC,
            batteryPercent: seed.batteryPercent,
            signalStrength: seed.signalStrength,
            measurementQuality: seed.measurementQuality,
            sourcePayload: {
              source: 'seed',
              deviceUid: seed.deviceUid,
            },
            receivedAt: measuredAt,
          });
        }
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
        const containerSeed = CONTAINER_SEEDS.find((item) => item.code === seed.containerCode);

        if (!containerId || !reporterUserId || !containerSeed) {
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
            containerCodeSnapshot: containerSeed.code,
            containerLabelSnapshot: containerSeed.label,
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

      const alertRuleIds = new Map<string, string>();
      for (const seed of ALERT_RULE_SEEDS) {
        const matchingRules = await tx
          .select()
          .from(alertRules)
          .where(eq(alertRules.scopeType, seed.scopeType));
        const existingRule = matchingRules.find(
          (row) =>
            (row.scopeKey ?? null) === (seed.scopeKey ?? null) &&
            (row.recipientRole ?? null) === (seed.recipientRole ?? null),
        );

        if (existingRule) {
          const [updatedRule] = await tx
            .update(alertRules)
            .set({
              warningFillPercent: seed.warningFillPercent ?? null,
              criticalFillPercent: seed.criticalFillPercent ?? null,
              anomalyTypeCode: seed.anomalyTypeCode ?? null,
              notifyChannels: seed.notifyChannels,
              isActive: seed.isActive,
              updatedAt: now,
            })
            .where(eq(alertRules.id, existingRule.id))
            .returning();

          if (!updatedRule) {
            throw new Error(`Failed to update alert rule: ${seed.scopeType}/${seed.scopeKey ?? 'global'}`);
          }

          alertRuleIds.set(`${seed.scopeType}:${seed.scopeKey ?? 'global'}`, updatedRule.id);
          continue;
        }

        const [createdRule] = await tx
          .insert(alertRules)
          .values({
            scopeType: seed.scopeType,
            scopeKey: seed.scopeKey ?? null,
            warningFillPercent: seed.warningFillPercent ?? null,
            criticalFillPercent: seed.criticalFillPercent ?? null,
            anomalyTypeCode: seed.anomalyTypeCode ?? null,
            notifyChannels: seed.notifyChannels,
            recipientRole: seed.recipientRole ?? null,
            isActive: seed.isActive,
          })
          .returning();

        if (!createdRule) {
          throw new Error(`Failed to create alert rule: ${seed.scopeType}/${seed.scopeKey ?? 'global'}`);
        }

        alertRuleIds.set(`${seed.scopeType}:${seed.scopeKey ?? 'global'}`, createdRule.id);
      }

      for (const seed of ALERT_EVENT_SEEDS) {
        const containerId = seed.containerCode ? containerIds.get(seed.containerCode) ?? null : null;
        const zoneId = seed.zoneCode ? zoneIds.get(seed.zoneCode) ?? null : null;
        const acknowledgedByUserId = seed.acknowledgedByEmail ? userIds.get(seed.acknowledgedByEmail) ?? null : null;
        const ruleId =
          seed.ruleScopeType != null
            ? alertRuleIds.get(`${seed.ruleScopeType}:${seed.ruleScopeKey ?? 'global'}`) ?? null
            : null;

        const matchingEvents = await tx
          .select()
          .from(alertEvents)
          .where(eq(alertEvents.eventType, seed.eventType));
        const existingEvent = matchingEvents.find(
          (row) =>
            (row.containerId ?? null) === containerId &&
            row.currentStatus === seed.currentStatus,
        );

        if (existingEvent) {
          const [updatedEvent] = await tx
            .update(alertEvents)
            .set({
              ruleId,
              zoneId,
              severity: seed.severity,
              acknowledgedByUserId,
              payloadSnapshot: seed.payloadSnapshot,
            })
            .where(eq(alertEvents.id, existingEvent.id))
            .returning();

          if (!updatedEvent) {
            throw new Error(`Failed to update alert event: ${seed.eventType}`);
          }

          continue;
        }

        const [createdEvent] = await tx
          .insert(alertEvents)
          .values({
            ruleId,
            containerId,
            zoneId,
            eventType: seed.eventType,
            severity: seed.severity,
            triggeredAt: now,
            currentStatus: seed.currentStatus,
            acknowledgedByUserId,
            payloadSnapshot: seed.payloadSnapshot,
          })
          .returning();

        if (!createdEvent) {
          throw new Error(`Failed to create alert event: ${seed.eventType}`);
        }

      }

      for (const seed of NOTIFICATION_SEEDS) {
        const [existingNotification] = await tx
          .select()
          .from(notifications)
          .where(
            and(
              eq(notifications.eventType, seed.eventType),
              eq(notifications.entityType, seed.entityType),
              eq(notifications.entityId, seed.entityId),
            ),
          )
          .limit(1);

        const notification =
          existingNotification
            ? (
                await tx
                  .update(notifications)
                  .set({
                    audienceScope: seed.audienceScope,
                    title: seed.title,
                    body: seed.body,
                    preferredChannels: seed.preferredChannels,
                    status: seed.status,
                  })
                  .where(eq(notifications.id, existingNotification.id))
                  .returning()
              )[0]
            : (
                await tx
                  .insert(notifications)
                  .values({
                    eventType: seed.eventType,
                    entityType: seed.entityType,
                    entityId: seed.entityId,
                    audienceScope: seed.audienceScope,
                    title: seed.title,
                    body: seed.body,
                    preferredChannels: seed.preferredChannels,
                    status: seed.status,
                    scheduledAt: now,
                  })
                  .returning()
              )[0];

        if (!notification) {
          throw new Error(`Failed to resolve notification seed: ${seed.eventType}`);
        }

        for (const delivery of seed.deliveries) {
          const [existingDelivery] = await tx
            .select()
            .from(notificationDeliveries)
            .where(
              and(
                eq(notificationDeliveries.notificationId, notification.id),
                eq(notificationDeliveries.channel, delivery.channel),
                eq(notificationDeliveries.recipientAddress, delivery.recipientAddress),
              ),
            )
            .limit(1);

          if (existingDelivery) {
            await tx
              .update(notificationDeliveries)
              .set({
                deliveryStatus: delivery.deliveryStatus,
                attemptCount: delivery.attemptCount,
                lastAttemptAt: now,
                deliveredAt: delivery.deliveryStatus === 'delivered' ? now : null,
                errorCode: delivery.deliveryStatus === 'failed' ? 'seed_failure' : null,
              })
              .where(eq(notificationDeliveries.id, existingDelivery.id));
            continue;
          }

          await tx.insert(notificationDeliveries).values({
            notificationId: notification.id,
            channel: delivery.channel,
            recipientAddress: delivery.recipientAddress,
            deliveryStatus: delivery.deliveryStatus,
            attemptCount: delivery.attemptCount,
            lastAttemptAt: now,
            deliveredAt: delivery.deliveryStatus === 'delivered' ? now : null,
            errorCode: delivery.deliveryStatus === 'failed' ? 'seed_failure' : null,
          });
        }
      }

      const allTours = await tx.select({ id: tours.id }).from(tours);
      for (const tourRow of allTours) {
        const persistedStops = await tx
          .select({
            stopOrder: tourStops.stopOrder,
            latitude: containers.latitude,
            longitude: containers.longitude,
          })
          .from(tourStops)
          .innerJoin(containers, eq(tourStops.containerId, containers.id))
          .where(eq(tourStops.tourId, tourRow.id))
          .orderBy(asc(tourStops.stopOrder));

        const persistedRoute = buildPersistedRouteSeed(persistedStops);
        if (!persistedRoute) {
          await tx.delete(tourRoutes).where(eq(tourRoutes.tourId, tourRow.id));
          continue;
        }

        await tx
          .insert(tourRoutes)
          .values({
            tourId: tourRow.id,
            geometry: persistedRoute.geometry,
            distanceMeters: persistedRoute.distanceMeters,
            durationMinutes: persistedRoute.durationMinutes,
            source: persistedRoute.source,
            provider: persistedRoute.provider,
            resolvedAt: now,
          })
          .onConflictDoUpdate({
            target: tourRoutes.tourId,
            set: {
              geometry: persistedRoute.geometry,
              distanceMeters: persistedRoute.distanceMeters,
              durationMinutes: persistedRoute.durationMinutes,
              source: persistedRoute.source,
              provider: persistedRoute.provider,
              resolvedAt: now,
              updatedAt: now,
            },
          });
      }
    });
  } finally {
    await dispose();
  }
}


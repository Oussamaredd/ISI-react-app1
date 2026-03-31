import { and, asc, eq, inArray } from 'drizzle-orm';
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

type ContainerSeedBlueprint = Omit<ContainerSeed, 'label' | 'status'> & {
  address: string;
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
    title: 'Overflow reported near Louvre collection point',
    description: 'Trilib station on Rue Croix des Petits Champs is nearing capacity before midday pickup.',
    status: 'open',
    priority: 'high',
    requesterEmail: 'agent@example.com',
    assigneeEmail: 'manager@example.com',
  },
  {
    title: 'Collection delay in Paris 10e sector',
    description: 'Residents reported a delayed pickup sequence around Place Jacques Bonsergent during the morning round.',
    status: 'in_progress',
    priority: 'medium',
    requesterEmail: 'agent@example.com',
    assigneeEmail: 'manager@example.com',
  },
  {
    title: 'Paris 14e container repair follow-up',
    description: 'Repair verification for the Edgar Quinet public collection point has been completed.',
    status: 'completed',
    priority: 'low',
    requesterEmail: 'manager@example.com',
    assigneeEmail: 'manager@example.com',
  },
];

const COMMENT_SEEDS: CommentSeed[] = [
  {
    ticketTitle: 'Overflow reported near Louvre collection point',
    authorEmail: 'agent@example.com',
    body: 'Escalated by field observation and resident feedback from the Louvre block. Please prioritize.',
  },
  {
    ticketTitle: 'Collection delay in Paris 10e sector',
    authorEmail: 'manager@example.com',
    body: 'Dispatch updated for the 10e route and the revised ETA has been shared with operations.',
  },
  {
    ticketTitle: 'Paris 14e container repair follow-up',
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

const CONTAINER_LABEL_SUFFIX_BY_TYPE: Record<string, string> = {
  glass: 'Verre',
  recyclables: 'Trilib',
  textile: 'Textile',
  general_mixed: 'Mixed Waste',
};

const buildSeedContainerLabel = (address: string, containerTypeCode: string) =>
  `${address} - ${CONTAINER_LABEL_SUFFIX_BY_TYPE[containerTypeCode] ?? 'Container'}`;

const resolveSeedContainerStatus = (fillLevelPercent: number) =>
  fillLevelPercent >= 75 ? 'attention_required' : 'available';

// Curated sample from Paris open-data collection points. Keep the footprint small for demo and Neon plans.
const ZONE_SEEDS: ZoneSeed[] = [
  {
    name: 'Paris 1er - Louvre',
    code: 'ZONE-DOWNTOWN',
    description: 'Operational collection zone for Louvre, Palais-Royal, and Les Halles.',
  },
  {
    name: 'Paris 2e - Bourse',
    code: 'ZONE-HARBOR',
    description: 'Operational collection zone for Bourse, Montorgueil, and Sentier.',
  },
  {
    name: 'Paris 3e - Temple',
    code: 'ZONE-PARIS-03',
    description: 'Operational collection zone for Temple, Arts-et-Metiers, and the upper Marais.',
  },
  {
    name: 'Paris 4e - Hotel-de-Ville',
    code: 'ZONE-PARIS-04',
    description: 'Operational collection zone for Hotel-de-Ville, Saint-Gervais, and Ile Saint-Louis.',
  },
  {
    name: 'Paris 5e - Pantheon',
    code: 'ZONE-PARIS-05',
    description: 'Operational collection zone for Pantheon, Jardin des Plantes, and Saint-Victor.',
  },
  {
    name: 'Paris 6e - Luxembourg',
    code: 'ZONE-PARIS-06',
    description: 'Operational collection zone for Luxembourg, Odeon, and Saint-Germain-des-Pres.',
  },
  {
    name: 'Paris 7e - Palais-Bourbon',
    code: 'ZONE-PARIS-07',
    description: 'Operational collection zone for Invalides, Ecole Militaire, and the Seine embankments.',
  },
  {
    name: 'Paris 8e - Elysee',
    code: 'ZONE-PARIS-08',
    description: 'Operational collection zone for Madeleine, Europe, and Champs-Elysees side streets.',
  },
  {
    name: 'Paris 9e - Opera',
    code: 'ZONE-PARIS-09',
    description: 'Operational collection zone for Opera, Pigalle, and Saint-Georges.',
  },
  {
    name: 'Paris 10e - Entrepot',
    code: 'ZONE-PARIS-10',
    description: 'Operational collection zone for Canal Saint-Martin, Gare de l Est, and Saint-Vincent-de-Paul.',
  },
  {
    name: 'Paris 11e - Popincourt',
    code: 'ZONE-PARIS-11',
    description: 'Operational collection zone for Republique eastbound, Bastille north, and Menilmontant gateway streets.',
  },
  {
    name: 'Paris 12e - Reuilly',
    code: 'ZONE-PARIS-12',
    description: 'Operational collection zone for Picpus, Bercy, and Daumesnil corridors.',
  },
  {
    name: 'Paris 13e - Gobelins',
    code: 'ZONE-PARIS-13',
    description: 'Operational collection zone for Gobelins, Butte-aux-Cailles, and Avenue de France.',
  },
  {
    name: 'Paris 14e - Observatoire',
    code: 'ZONE-PARIS-14',
    description: 'Operational collection zone for Montparnasse south, Denfert-Rochereau, and Alésia.',
  },
  {
    name: 'Paris 15e - Vaugirard',
    code: 'ZONE-PARIS-15',
    description: 'Operational collection zone for Vaugirard, Beaugrenelle, and Convention.',
  },
  {
    name: 'Paris 16e - Passy',
    code: 'ZONE-PARIS-16',
    description: 'Operational collection zone for Passy, Trocadero, and Porte Dauphine.',
  },
  {
    name: 'Paris 17e - Batignolles-Monceau',
    code: 'ZONE-PARIS-17',
    description: 'Operational collection zone for Batignolles, Ternes, and Monceau fringe streets.',
  },
  {
    name: 'Paris 18e - Buttes-Montmartre',
    code: 'ZONE-PARIS-18',
    description: 'Operational collection zone for Montmartre foothills, Clignancourt, and Porte de la Chapelle.',
  },
  {
    name: 'Paris 19e - Buttes-Chaumont',
    code: 'ZONE-PARIS-19',
    description: 'Operational collection zone for Villette, Buttes-Chaumont, and Canal de l Ourcq.',
  },
  {
    name: 'Paris 20e - Menilmontant',
    code: 'ZONE-PARIS-20',
    description: 'Operational collection zone for Gambetta, Belleville south, and the eastern Paris boundary.',
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
    code: 'textile',
    label: 'Textile',
    wasteStream: 'textile',
    nominalCapacityLiters: 800,
    defaultFillAlertPercent: 70,
    defaultCriticalAlertPercent: 90,
    colorCode: '#C77D3B',
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

const CONTAINER_SEED_BLUEPRINTS: ContainerSeedBlueprint[] = [
  {
    code: 'CTR-1001',
    address: '10 RUE DE L ECHELLE',
    fillLevelPercent: 44,
    zoneCode: 'ZONE-DOWNTOWN',
    containerTypeCode: 'glass',
    latitude: '48.864360',
    longitude: '2.334760',
  },
  {
    code: 'CTR-1002',
    address: '17 RUE CROIX DES PETITS CHAMPS',
    fillLevelPercent: 76,
    zoneCode: 'ZONE-DOWNTOWN',
    containerTypeCode: 'recyclables',
    latitude: '48.863444',
    longitude: '2.339586',
  },
  {
    code: 'CTR-1003',
    address: 'ANGLE RUE DU BOULOI / RUE DU COLONEL DRIANT',
    fillLevelPercent: 54,
    zoneCode: 'ZONE-DOWNTOWN',
    containerTypeCode: 'textile',
    latitude: '48.863402',
    longitude: '2.340617',
  },
  {
    code: 'CTR-1004',
    address: '128 RUE REAUMUR',
    fillLevelPercent: 58,
    zoneCode: 'ZONE-HARBOR',
    containerTypeCode: 'glass',
    latitude: '48.868312',
    longitude: '2.343263',
  },
  {
    code: 'CTR-1005',
    address: '11 RUE DE GRAMONT',
    fillLevelPercent: 69,
    zoneCode: 'ZONE-HARBOR',
    containerTypeCode: 'recyclables',
    latitude: '48.870022',
    longitude: '2.336816',
  },
  {
    code: 'CTR-1006',
    address: '14 RUE D ALEXANDRIE',
    fillLevelPercent: 63,
    zoneCode: 'ZONE-HARBOR',
    containerTypeCode: 'glass',
    latitude: '48.868318',
    longitude: '2.350061',
  },
  {
    code: 'CTR-1007',
    address: '1 RUE AUX OURS',
    fillLevelPercent: 37,
    zoneCode: 'ZONE-PARIS-03',
    containerTypeCode: 'glass',
    latitude: '48.863005',
    longitude: '2.352259',
  },
  {
    code: 'CTR-1008',
    address: '13 RUE MESLAY',
    fillLevelPercent: 88,
    zoneCode: 'ZONE-PARIS-03',
    containerTypeCode: 'recyclables',
    latitude: '48.867510',
    longitude: '2.361047',
  },
  {
    code: 'CTR-1009',
    address: '106 BOULEVARD SEBASTOPOL',
    fillLevelPercent: 61,
    zoneCode: 'ZONE-PARIS-03',
    containerTypeCode: 'textile',
    latitude: '48.868383',
    longitude: '2.353535',
  },
  {
    code: 'CTR-1010',
    address: '1 RUE DU FAUCONNIER',
    fillLevelPercent: 63,
    zoneCode: 'ZONE-PARIS-04',
    containerTypeCode: 'glass',
    latitude: '48.853186',
    longitude: '2.359111',
  },
  {
    code: 'CTR-2001',
    address: '12 RUE DE LA CERISAIE',
    fillLevelPercent: 73,
    zoneCode: 'ZONE-PARIS-04',
    containerTypeCode: 'recyclables',
    latitude: '48.851982',
    longitude: '2.366071',
  },
  {
    code: 'CTR-P04-03',
    address: '21 BIS BOULEVARD BOURDON',
    fillLevelPercent: 31,
    zoneCode: 'ZONE-PARIS-04',
    containerTypeCode: 'textile',
    latitude: '48.849722',
    longitude: '2.366947',
  },
  {
    code: 'CTR-P05-01',
    address: '10 BOULEVARD SAINT MARCEL',
    fillLevelPercent: 49,
    zoneCode: 'ZONE-PARIS-05',
    containerTypeCode: 'glass',
    latitude: '48.839733',
    longitude: '2.360803',
  },
  {
    code: 'CTR-P05-02',
    address: '1 RUE DU GRIL',
    fillLevelPercent: 82,
    zoneCode: 'ZONE-PARIS-05',
    containerTypeCode: 'recyclables',
    latitude: '48.841006',
    longitude: '2.354758',
  },
  {
    code: 'CTR-P05-03',
    address: '1 BOULEVARD SAINT-MICHEL',
    fillLevelPercent: 46,
    zoneCode: 'ZONE-PARIS-05',
    containerTypeCode: 'textile',
    latitude: '48.852841',
    longitude: '2.343973',
  },
  {
    code: 'CTR-P06-01',
    address: '1 QUAI DE CONTI',
    fillLevelPercent: 44,
    zoneCode: 'ZONE-PARIS-06',
    containerTypeCode: 'glass',
    latitude: '48.855987',
    longitude: '2.340324',
  },
  {
    code: 'CTR-P06-02',
    address: '11 RUE DE MEDICIS',
    fillLevelPercent: 76,
    zoneCode: 'ZONE-PARIS-06',
    containerTypeCode: 'recyclables',
    latitude: '48.848218',
    longitude: '2.339828',
  },
  {
    code: 'CTR-P06-03',
    address: '114 BOULEVARD RASPAIL',
    fillLevelPercent: 54,
    zoneCode: 'ZONE-PARIS-06',
    containerTypeCode: 'textile',
    latitude: '48.844736',
    longitude: '2.328799',
  },
  {
    code: 'CTR-P07-01',
    address: '1 AVENUE DUQUESNE',
    fillLevelPercent: 58,
    zoneCode: 'ZONE-PARIS-07',
    containerTypeCode: 'glass',
    latitude: '48.853924',
    longitude: '2.306975',
  },
  {
    code: 'CTR-P07-02',
    address: '35 BIS RUE DE SEVRES',
    fillLevelPercent: 69,
    zoneCode: 'ZONE-PARIS-07',
    containerTypeCode: 'recyclables',
    latitude: '48.850922',
    longitude: '2.325569',
  },
  {
    code: 'CTR-P07-03',
    address: '12 RUE DE SEVRES - PAV',
    fillLevelPercent: 39,
    zoneCode: 'ZONE-PARIS-07',
    containerTypeCode: 'textile',
    latitude: '48.851362',
    longitude: '2.326845',
  },
  {
    code: 'CTR-P08-01',
    address: '1 AVENUE BEAUCOUR',
    fillLevelPercent: 37,
    zoneCode: 'ZONE-PARIS-08',
    containerTypeCode: 'glass',
    latitude: '48.876695',
    longitude: '2.301613',
  },
  {
    code: 'CTR-P08-02',
    address: '1 RUE DE CONSTANTINOPLE',
    fillLevelPercent: 88,
    zoneCode: 'ZONE-PARIS-08',
    containerTypeCode: 'recyclables',
    latitude: '48.879330',
    longitude: '2.322516',
  },
  {
    code: 'CTR-P08-03',
    address: '1 AVENUE CESAR CAIRE',
    fillLevelPercent: 61,
    zoneCode: 'ZONE-PARIS-08',
    containerTypeCode: 'textile',
    latitude: '48.875977',
    longitude: '2.319262',
  },
  {
    code: 'CTR-P09-01',
    address: '10 AVENUE TRUDAINE',
    fillLevelPercent: 63,
    zoneCode: 'ZONE-PARIS-09',
    containerTypeCode: 'glass',
    latitude: '48.881780',
    longitude: '2.345360',
  },
  {
    code: 'CTR-P09-02',
    address: '12 RUE JEAN BAPTISTE PIGALLE',
    fillLevelPercent: 73,
    zoneCode: 'ZONE-PARIS-09',
    containerTypeCode: 'recyclables',
    latitude: '48.878512',
    longitude: '2.332714',
  },
  {
    code: 'CTR-P09-03',
    address: '16 BOULEVARD DES ITALIENS',
    fillLevelPercent: 31,
    zoneCode: 'ZONE-PARIS-09',
    containerTypeCode: 'textile',
    latitude: '48.871815',
    longitude: '2.338595',
  },
  {
    code: 'CTR-P10-01',
    address: '10 PLACE JACQUES BONSERGENT',
    fillLevelPercent: 49,
    zoneCode: 'ZONE-PARIS-10',
    containerTypeCode: 'glass',
    latitude: '48.871147',
    longitude: '2.361073',
  },
  {
    code: 'CTR-P10-02',
    address: '10 RUE PIERRE DUPONT',
    fillLevelPercent: 82,
    zoneCode: 'ZONE-PARIS-10',
    containerTypeCode: 'recyclables',
    latitude: '48.879319',
    longitude: '2.365111',
  },
  {
    code: 'CTR-P10-03',
    address: '1 PLACE DE LA BATAILLE DE STALINGRAD',
    fillLevelPercent: 46,
    zoneCode: 'ZONE-PARIS-10',
    containerTypeCode: 'textile',
    latitude: '48.882724',
    longitude: '2.369701',
  },
  {
    code: 'CTR-P11-01',
    address: 'PLACE DARNO MAFFINI',
    fillLevelPercent: 44,
    zoneCode: 'ZONE-PARIS-11',
    containerTypeCode: 'glass',
    latitude: '48.866552',
    longitude: '2.369242',
  },
  {
    code: 'CTR-P11-02',
    address: '1 RUE CONDILLAC',
    fillLevelPercent: 76,
    zoneCode: 'ZONE-PARIS-11',
    containerTypeCode: 'recyclables',
    latitude: '48.863768',
    longitude: '2.383417',
  },
  {
    code: 'CTR-P11-03',
    address: '78 BOULEVARD MENILMONTANT',
    fillLevelPercent: 54,
    zoneCode: 'ZONE-PARIS-11',
    containerTypeCode: 'textile',
    latitude: '48.864094',
    longitude: '2.385980',
  },
  {
    code: 'CTR-P12-01',
    address: '1 AVENUE COURTELINE',
    fillLevelPercent: 58,
    zoneCode: 'ZONE-PARIS-12',
    containerTypeCode: 'glass',
    latitude: '48.844333',
    longitude: '2.410834',
  },
  {
    code: 'CTR-P12-02',
    address: '1 AVENUE DU BEL AIR',
    fillLevelPercent: 69,
    zoneCode: 'ZONE-PARIS-12',
    containerTypeCode: 'recyclables',
    latitude: '48.845566',
    longitude: '2.398066',
  },
  {
    code: 'CTR-P12-03',
    address: '10 PLACE LACHAMBEAUDIE',
    fillLevelPercent: 39,
    zoneCode: 'ZONE-PARIS-12',
    containerTypeCode: 'textile',
    latitude: '48.836032',
    longitude: '2.386923',
  },
  {
    code: 'CTR-P13-01',
    address: '1 AVENUE BOUTROUX',
    fillLevelPercent: 37,
    zoneCode: 'ZONE-PARIS-13',
    containerTypeCode: 'glass',
    latitude: '48.822757',
    longitude: '2.377733',
  },
  {
    code: 'CTR-P13-02',
    address: '1 RUE AUGUSTE LANCON',
    fillLevelPercent: 88,
    zoneCode: 'ZONE-PARIS-13',
    containerTypeCode: 'recyclables',
    latitude: '48.824558',
    longitude: '2.346423',
  },
  {
    code: 'CTR-P13-03',
    address: '1 PLACE DE L ABBE HENOCQUE',
    fillLevelPercent: 61,
    zoneCode: 'ZONE-PARIS-13',
    containerTypeCode: 'textile',
    latitude: '48.824111',
    longitude: '2.353502',
  },
  {
    code: 'CTR-P14-01',
    address: '1 BOULEVARD EDGAR QUINET',
    fillLevelPercent: 63,
    zoneCode: 'ZONE-PARIS-14',
    containerTypeCode: 'glass',
    latitude: '48.839302',
    longitude: '2.329933',
  },
  {
    code: 'CTR-P14-02',
    address: '1 RUE ALPHONSE DAUDET',
    fillLevelPercent: 73,
    zoneCode: 'ZONE-PARIS-14',
    containerTypeCode: 'recyclables',
    latitude: '48.826227',
    longitude: '2.328516',
  },
  {
    code: 'CTR-P14-03',
    address: '111 AVENUE DU GENERAL LECLERC',
    fillLevelPercent: 31,
    zoneCode: 'ZONE-PARIS-14',
    containerTypeCode: 'textile',
    latitude: '48.825013',
    longitude: '2.326032',
  },
  {
    code: 'CTR-P15-01',
    address: '1 PLACE VIOLET',
    fillLevelPercent: 49,
    zoneCode: 'ZONE-PARIS-15',
    containerTypeCode: 'glass',
    latitude: '48.844733',
    longitude: '2.290445',
  },
  {
    code: 'CTR-P15-02',
    address: '1 PLACE CHANTAL MAUDUIT',
    fillLevelPercent: 82,
    zoneCode: 'ZONE-PARIS-15',
    containerTypeCode: 'recyclables',
    latitude: '48.830708',
    longitude: '2.303949',
  },
  {
    code: 'CTR-P15-03',
    address: '10 RUE ANDRE GIDE',
    fillLevelPercent: 46,
    zoneCode: 'ZONE-PARIS-15',
    containerTypeCode: 'textile',
    latitude: '48.837840',
    longitude: '2.314150',
  },
  {
    code: 'CTR-P16-01',
    address: '1 PLACE ROCHAMBEAU',
    fillLevelPercent: 44,
    zoneCode: 'ZONE-PARIS-16',
    containerTypeCode: 'glass',
    latitude: '48.866284',
    longitude: '2.296781',
  },
  {
    code: 'CTR-P16-02',
    address: '1 RUE PICCINI',
    fillLevelPercent: 76,
    zoneCode: 'ZONE-PARIS-16',
    containerTypeCode: 'recyclables',
    latitude: '48.873641',
    longitude: '2.285703',
  },
  {
    code: 'CTR-P16-03',
    address: '1 AVENUE D EYLAU',
    fillLevelPercent: 54,
    zoneCode: 'ZONE-PARIS-16',
    containerTypeCode: 'textile',
    latitude: '48.863449',
    longitude: '2.286073',
  },
  {
    code: 'CTR-P17-01',
    address: '1 PLACE YVON ET CLAIRE MORANDAT',
    fillLevelPercent: 58,
    zoneCode: 'ZONE-PARIS-17',
    containerTypeCode: 'glass',
    latitude: '48.875928',
    longitude: '2.288769',
  },
  {
    code: 'CTR-P17-02',
    address: '1 AVENUE BRUNETIERE',
    fillLevelPercent: 69,
    zoneCode: 'ZONE-PARIS-17',
    containerTypeCode: 'recyclables',
    latitude: '48.890871',
    longitude: '2.302219',
  },
  {
    code: 'CTR-P17-03',
    address: '1 BOULEVARD PEREIRE',
    fillLevelPercent: 39,
    zoneCode: 'ZONE-PARIS-17',
    containerTypeCode: 'textile',
    latitude: '48.887334',
    longitude: '2.314120',
  },
  {
    code: 'CTR-P18-01',
    address: '1 RUE DAMREMONT',
    fillLevelPercent: 37,
    zoneCode: 'ZONE-PARIS-18',
    containerTypeCode: 'glass',
    latitude: '48.887187',
    longitude: '2.332502',
  },
  {
    code: 'CTR-P18-02',
    address: '1 RUE CHARLES HERMITE',
    fillLevelPercent: 88,
    zoneCode: 'ZONE-PARIS-18',
    containerTypeCode: 'recyclables',
    latitude: '48.899813',
    longitude: '2.369903',
  },
  {
    code: 'CTR-P18-03',
    address: '1 AVENUE JUNOT',
    fillLevelPercent: 61,
    zoneCode: 'ZONE-PARIS-18',
    containerTypeCode: 'textile',
    latitude: '48.887716',
    longitude: '2.337127',
  },
  {
    code: 'CTR-P19-01',
    address: '1 PLACE DU MAROC',
    fillLevelPercent: 63,
    zoneCode: 'ZONE-PARIS-19',
    containerTypeCode: 'glass',
    latitude: '48.886375',
    longitude: '2.369297',
  },
  {
    code: 'CTR-P19-02',
    address: '1 RUE LAUZIN',
    fillLevelPercent: 73,
    zoneCode: 'ZONE-PARIS-19',
    containerTypeCode: 'recyclables',
    latitude: '48.874815',
    longitude: '2.378809',
  },
  {
    code: 'CTR-P19-03',
    address: '118 BOULEVARD DE LA VILLETTE',
    fillLevelPercent: 31,
    zoneCode: 'ZONE-PARIS-19',
    containerTypeCode: 'textile',
    latitude: '48.877252',
    longitude: '2.371224',
  },
  {
    code: 'CTR-P20-01',
    address: '1 RUE DU COMMANDANT L HERMINIER',
    fillLevelPercent: 49,
    zoneCode: 'ZONE-PARIS-20',
    containerTypeCode: 'glass',
    latitude: '48.847039',
    longitude: '2.415870',
  },
  {
    code: 'CTR-P20-02',
    address: '1 RUE FELIX HUGUENET',
    fillLevelPercent: 82,
    zoneCode: 'ZONE-PARIS-20',
    containerTypeCode: 'recyclables',
    latitude: '48.848103',
    longitude: '2.404836',
  },
  {
    code: 'CTR-P20-03',
    address: '101 RUE DE LAGNY',
    fillLevelPercent: 46,
    zoneCode: 'ZONE-PARIS-20',
    containerTypeCode: 'textile',
    latitude: '48.849241',
    longitude: '2.410591',
  },
];

const CONTAINER_SEEDS: ContainerSeed[] = CONTAINER_SEED_BLUEPRINTS.map(({ address, ...seed }) => ({
  ...seed,
  label: buildSeedContainerLabel(address, seed.containerTypeCode),
  status: resolveSeedContainerStatus(seed.fillLevelPercent),
}));

const TOUR_SEEDS: TourSeed[] = [
  {
    name: 'Paris 1er Morning Round',
    status: 'planned',
    zoneCode: 'ZONE-DOWNTOWN',
    assignedAgentEmail: 'agent@example.com',
    scheduledForOffsetDays: 0,
    stopContainerCodes: ['CTR-1002', 'CTR-1001', 'CTR-1003'],
  },
];

const LEGACY_TOUR_SEED_NAMES = ['Downtown Morning Round'];

const CITIZEN_REPORT_SEEDS: CitizenReportSeed[] = [
  {
    containerCode: 'CTR-1002',
    reporterEmail: 'citizen@example.com',
    status: 'submitted',
    description: '[container_full] Trilib station is close to overflow near the Louvre sector.',
    latitude: '48.863444',
    longitude: '2.339586',
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
    tourName: 'Paris 1er Morning Round',
    stopOrder: 1,
    reporterEmail: 'agent@example.com',
    comments: 'Delivery vans blocked access on Rue Croix des Petits Champs for 20 minutes.',
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
    fillLevelPercent: 44,
    temperatureC: 21,
    batteryPercent: 88,
    signalStrength: -67,
    measurementQuality: 'valid',
  },
  {
    deviceUid: 'sensor-ctr-1002',
    containerCode: 'CTR-1002',
    measuredAt: '2026-03-03T07:50:00.000Z',
    fillLevelPercent: 76,
    temperatureC: 23,
    batteryPercent: 61,
    signalStrength: -71,
    measurementQuality: 'valid',
  },
  {
    deviceUid: 'sensor-ctr-1003',
    containerCode: 'CTR-1003',
    measuredAt: '2026-03-03T07:55:00.000Z',
    fillLevelPercent: 54,
    temperatureC: 20,
    batteryPercent: 92,
    signalStrength: -65,
    measurementQuality: 'valid',
  },
  {
    deviceUid: 'sensor-ctr-1004',
    containerCode: 'CTR-1004',
    measuredAt: '2026-03-03T08:00:00.000Z',
    fillLevelPercent: 58,
    temperatureC: 22,
    batteryPercent: 75,
    signalStrength: -68,
    measurementQuality: 'valid',
  },
  {
    deviceUid: 'sensor-ctr-1005',
    containerCode: 'CTR-1005',
    measuredAt: '2026-03-03T08:05:00.000Z',
    fillLevelPercent: 69,
    temperatureC: 19,
    batteryPercent: 95,
    signalStrength: -63,
    measurementQuality: 'valid',
  },
  {
    deviceUid: 'sensor-ctr-1006',
    containerCode: 'CTR-1006',
    measuredAt: '2026-03-03T08:10:00.000Z',
    fillLevelPercent: 63,
    temperatureC: 24,
    batteryPercent: 55,
    signalStrength: -72,
    measurementQuality: 'valid',
  },
  {
    deviceUid: 'sensor-ctr-1007',
    containerCode: 'CTR-1007',
    measuredAt: '2026-03-03T08:15:00.000Z',
    fillLevelPercent: 37,
    temperatureC: 21,
    batteryPercent: 80,
    signalStrength: -69,
    measurementQuality: 'valid',
  },
  {
    deviceUid: 'sensor-ctr-1008',
    containerCode: 'CTR-1008',
    measuredAt: '2026-03-03T08:20:00.000Z',
    fillLevelPercent: 88,
    temperatureC: 20,
    batteryPercent: 68,
    signalStrength: -70,
    measurementQuality: 'valid',
  },
  {
    deviceUid: 'sensor-ctr-1009',
    containerCode: 'CTR-1009',
    measuredAt: '2026-03-03T08:25:00.000Z',
    fillLevelPercent: 61,
    temperatureC: 25,
    batteryPercent: 42,
    signalStrength: -74,
    measurementQuality: 'valid',
  },
  {
    deviceUid: 'sensor-ctr-1010',
    containerCode: 'CTR-1010',
    measuredAt: '2026-03-03T08:30:00.000Z',
    fillLevelPercent: 63,
    temperatureC: 18,
    batteryPercent: 90,
    signalStrength: -66,
    measurementQuality: 'valid',
  },
  {
    deviceUid: 'sensor-ctr-2001',
    containerCode: 'CTR-2001',
    measuredAt: '2026-03-02T21:45:00.000Z',
    fillLevelPercent: 73,
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
      fillLevelPercent: 76,
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
    body: 'CTR-1002 has crossed the warning threshold near the Louvre sector.',
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

      const managedTourNames = Array.from(
        new Set([...TOUR_SEEDS.map((seed) => seed.name), ...LEGACY_TOUR_SEED_NAMES]),
      );
      const managedTourAgentIds = Array.from(
        new Set(
          TOUR_SEEDS.map((seed) => userIds.get(seed.assignedAgentEmail)).filter(
            (agentId): agentId is string => Boolean(agentId),
          ),
        ),
      );
      if (managedTourNames.length > 0 && managedTourAgentIds.length > 0) {
        const staleManagedTours = await tx
          .select({ id: tours.id })
          .from(tours)
          .where(
            and(
              inArray(tours.name, managedTourNames),
              inArray(tours.assignedAgentId, managedTourAgentIds),
            ),
          );

        if (staleManagedTours.length > 0) {
          await tx.delete(tours).where(inArray(tours.id, staleManagedTours.map((tour) => tour.id)));
        }
      }

      const seededTourIds = new Map<string, string>();
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
          .returning({ id: tours.id });

        if (!tourRow) {
          throw new Error(`Failed to resolve tour: ${seed.name}`);
        }

        seededTourIds.set(seed.name, tourRow.id);
        await tx.delete(tourStops).where(eq(tourStops.tourId, tourRow.id));

        for (let index = 0; index < seed.stopContainerCodes.length; index += 1) {
          const containerCode = seed.stopContainerCodes[index];
          const containerId = containerIds.get(containerCode);

          if (!containerId) {
            throw new Error(`Missing container for tour stop: ${containerCode}`);
          }

          await tx.insert(tourStops).values({
            tourId: tourRow.id,
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
        const seededTourId = seededTourIds.get(seed.tourName);
        const [tourRow] = seededTourId
          ? await tx.select().from(tours).where(eq(tours.id, seededTourId)).limit(1)
          : await tx.select().from(tours).where(eq(tours.name, seed.tourName)).limit(1);
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

      const primarySeedTourId = TOUR_SEEDS[0] ? seededTourIds.get(TOUR_SEEDS[0].name) : null;
      const [firstTourStop] = primarySeedTourId
        ? await tx
            .select()
            .from(tourStops)
            .where(eq(tourStops.tourId, primarySeedTourId))
            .orderBy(asc(tourStops.stopOrder))
            .limit(1)
        : [];
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


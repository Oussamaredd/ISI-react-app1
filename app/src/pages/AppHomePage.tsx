import {
  ArrowRight,
  Compass,
  FileText,
  House,
  LifeBuoy,
  Map,
  Settings,
  Shield,
  Sparkles,
  Truck,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { useCurrentUser } from '../hooks/useAuth';
import { useCitizenProfile } from '../hooks/useCitizen';
import {
  hasAdminAccess,
  hasAgentAccess,
  hasCitizenAccess,
  hasManagerAccess,
} from '../utils/authz';

type WorkspaceLink = {
  label: string;
  description: string;
  meta: string;
  to: string;
};

type RoleGuide = {
  eyebrow: string;
  title: string;
  description: string;
  links: WorkspaceLink[];
};

type CitizenProfileSnapshot = {
  gamification?: {
    points?: number | null;
    badges?: string[] | null;
  };
  impact?: {
    reportsSubmitted?: number | null;
    reportsResolved?: number | null;
  };
};

type CitizenEntryState = 'loading' | 'first-run' | 'returning' | 'unavailable';

const universalLinks: WorkspaceLink[] = [
  {
    label: 'Support Workspace',
    description: 'Create, triage, and resolve support work from the shared operations surface.',
    meta: 'Shared operations',
    to: '/app/support',
  },
  {
    label: 'Settings',
    description: 'Review account details, sign-in methods, and session preferences.',
    meta: 'Account controls',
    to: '/app/settings',
  },
];

const managerLinks: WorkspaceLink[] = [
  {
    label: 'Live Dashboard',
    description: 'Track live volume, operational drift, and cross-team movement in real time.',
    meta: 'Manager-only live view',
    to: '/app/dashboard',
  },
  {
    label: 'Tour Planning',
    description: 'Shape assignments, route coverage, and field readiness before execution.',
    meta: 'Route orchestration',
    to: '/app/manager/planning',
  },
  {
    label: 'Manager Reports',
    description: 'Review trend reporting, export summaries, and monitor output history.',
    meta: 'Reporting lane',
    to: '/app/manager/reports',
  },
];

const agentLinks: WorkspaceLink[] = [
  {
    label: 'Agent Tour',
    description: 'Move into the active field lane for assigned routes and ticket execution.',
    meta: 'Field execution',
    to: '/app/agent/tour',
  },
];

const citizenLinks: WorkspaceLink[] = [
  {
    label: 'Report Overflow',
    description: 'Submit overflow issues directly into EcoTrack from the citizen surface.',
    meta: 'Issue intake',
    to: '/app/citizen/report',
  },
  {
    label: 'Citizen Profile',
    description: 'Review points, badges, report history, and current community participation.',
    meta: 'History and profile',
    to: '/app/citizen/profile',
  },
  {
    label: 'Challenges',
    description: 'Track goals, available programs, and participation progress.',
    meta: 'Engagement',
    to: '/app/citizen/challenges',
  },
];

const citizenFollowUpLinks: WorkspaceLink[] = [
  {
    label: 'Profile & History',
    description: 'Review points, badges, and your recent citizen reports.',
    meta: 'Follow-up',
    to: '/app/citizen/profile',
  },
  {
    label: 'Challenges',
    description: 'Open current citizen challenges without leaving the shared host.',
    meta: 'Engagement',
    to: '/app/citizen/challenges',
  },
  {
    label: 'Support',
    description: 'Get help if a mapped container or session issue blocks the report flow.',
    meta: 'Recovery',
    to: '/app/support',
  },
];

const adminLinks: WorkspaceLink[] = [
  {
    label: 'Admin Center',
    description: 'Manage access, governance defaults, and platform-wide control surfaces.',
    meta: 'Governance',
    to: '/app/admin',
  },
];

const citizenFirstRunChecklist = [
  'Choose an existing mapped container in the current report flow.',
  'Select the typed issue that best matches what you saw.',
  'Submit one valid report to unlock the lighter returning-citizen lane at /app.',
];

const citizenRecoveryNotes = [
  'Web GPS is optional. If location is unavailable or denied, keep going with manual mapped-container selection.',
  'If the mapped container no longer exists, reload the report page and choose another live container.',
  'If you already reported the same issue recently, EcoTrack will stop the duplicate and point you back to history.',
];

const buildRoleGuides = (options: {
  canAccessManager: boolean;
  canAccessAgent: boolean;
  canAccessCitizen: boolean;
  canAccessAdmin: boolean;
}) => {
  const guides: RoleGuide[] = [];

  if (options.canAccessManager) {
    guides.push({
      eyebrow: 'Operations lane',
      title: 'Manager control',
      description:
        'Manager-capable accounts can move into live monitoring, planning, and reporting without exposing those tools to other roles.',
      links: managerLinks,
    });
  }

  if (options.canAccessAgent) {
    guides.push({
      eyebrow: 'Field lane',
      title: 'Agent execution',
      description:
        'Agents use this host as a launch point into route execution and ticket delivery work.',
      links: agentLinks,
    });
  }

  if (options.canAccessCitizen) {
    guides.push({
      eyebrow: 'Community lane',
      title: 'Citizen experience',
      description:
        'Citizen access stays focused on reporting, participation, and personal progress.',
      links: citizenLinks,
    });
  }

  if (options.canAccessAdmin) {
    guides.push({
      eyebrow: 'Governance lane',
      title: 'Admin oversight',
      description:
        'Admins and super admins retain governance tools alongside the operational lanes they already inherit.',
      links: adminLinks,
    });
  }

  return guides;
};

const collectRoleNames = (user: {
  role?: string | null;
  roles?: Array<{ name?: string | null }> | null;
} | null | undefined) => {
  const roleNames = new Set<string>();

  if (typeof user?.role === 'string' && user.role.trim()) {
    roleNames.add(user.role.trim());
  }

  if (Array.isArray(user?.roles)) {
    for (const role of user.roles) {
      if (typeof role?.name === 'string' && role.name.trim()) {
        roleNames.add(role.name.trim());
      }
    }
  }

  return Array.from(roleNames);
};

const resolveFirstName = (user: {
  displayName?: string | null;
  name?: string | null;
  email?: string | null;
} | null | undefined) => {
  const candidates = [user?.displayName, user?.name];

  for (const candidate of candidates) {
    if (typeof candidate !== 'string') {
      continue;
    }

    const trimmed = candidate.trim();
    if (!trimmed) {
      continue;
    }

    return trimmed.split(/\s+/)[0] ?? 'there';
  }

  if (typeof user?.email === 'string') {
    const emailPrefix = user.email.trim().split('@')[0];
    if (emailPrefix) {
      return emailPrefix;
    }
  }

  return 'there';
};

const renderRouteIcon = (route: string, size = 16) => {
  if (route === '/app/support') {
    return <LifeBuoy size={size} aria-hidden="true" />;
  }

  if (route === '/app/settings') {
    return <Settings size={size} aria-hidden="true" />;
  }

  if (route === '/app/dashboard' || route.startsWith('/app/manager')) {
    return <Map size={size} aria-hidden="true" />;
  }

  if (route.startsWith('/app/agent')) {
    return <Truck size={size} aria-hidden="true" />;
  }

  if (route.startsWith('/app/citizen')) {
    return <FileText size={size} aria-hidden="true" />;
  }

  if (route.startsWith('/app/admin')) {
    return <Shield size={size} aria-hidden="true" />;
  }

  return <House size={size} aria-hidden="true" />;
};

const buildPriorityActions = (options: {
  canAccessManager: boolean;
  canAccessAgent: boolean;
  canAccessCitizen: boolean;
  canAccessAdmin: boolean;
}) => {
  const actions = [...universalLinks];

  if (options.canAccessManager) {
    actions.push(managerLinks[0]);
  }

  if (options.canAccessAgent) {
    actions.push(agentLinks[0]);
  }

  if (options.canAccessCitizen) {
    actions.push(citizenLinks[0]);
  }

  if (options.canAccessAdmin) {
    actions.push(adminLinks[0]);
  }

  return actions.slice(0, 4);
};

const formatCountLabel = (value: number, singular: string, plural: string) =>
  `${value} ${value === 1 ? singular : plural}`;

function CitizenEntrySection({
  state,
  profile,
  errorMessage,
}: {
  state: CitizenEntryState;
  profile: CitizenProfileSnapshot | null;
  errorMessage: string | null;
}) {
  const reportsSubmitted = Math.max(0, profile?.impact?.reportsSubmitted ?? 0);
  const reportsResolved = Math.max(0, profile?.impact?.reportsResolved ?? 0);
  const points = Math.max(0, profile?.gamification?.points ?? 0);
  const badgesCount = Array.isArray(profile?.gamification?.badges)
    ? profile?.gamification?.badges.length
    : 0;

  let eyebrow = 'Citizen lane';
  let title = 'Report quickly, then follow your impact';
  let description =
    'You have already completed the first-report milestone. Use /app as a lighter launch point into reporting, profile or history, and challenges.';
  let statusLabel = 'Recent citizen progress';

  if (state === 'loading') {
    eyebrow = 'Citizen onboarding';
    title = 'Checking your citizen first-report milestone';
    description =
      'EcoTrack is verifying whether this session already has a valid citizen report on record. You can still jump straight into reporting while the profile snapshot loads.';
    statusLabel = 'Current status';
  } else if (state === 'first-run') {
    eyebrow = 'Citizen first report';
    title = 'Complete your first valid container report';
    description =
      'Start with one report on an existing mapped container. After that first successful submission, /app becomes a lighter citizen lane with quick access to history, profile, and challenges.';
    statusLabel = 'What completion means';
  } else if (state === 'unavailable') {
    eyebrow = 'Citizen onboarding';
    title = 'Citizen progress is temporarily unavailable';
    description =
      'EcoTrack could not verify your citizen progress right now. You can still open the existing report flow, and sign-in recovery will keep the route intact if the session has expired.';
    statusLabel = 'Recovery';
  }

  return (
    <section className="app-home-card app-home-citizen-entry" aria-labelledby="citizen-entry-title">
      <div className="app-home-citizen-grid">
        <div className="app-home-citizen-copy">
          <div className="app-home-badge app-home-badge-citizen">
            <FileText size={14} aria-hidden="true" />
            {eyebrow}
          </div>

          <div className="app-home-citizen-heading">
            <h2 id="citizen-entry-title">{title}</h2>
            <p>{description}</p>
          </div>

          <div className="app-home-citizen-chip-row" aria-label="Citizen onboarding facts">
            <span className="app-home-citizen-chip">Mapped containers only</span>
            <span className="app-home-citizen-chip">GPS optional on web</span>
            <span className="app-home-citizen-chip">Same report flow, lighter follow-up after first report</span>
          </div>

          <div className="app-home-citizen-actions">
            <Link to="/app/citizen/report" className="app-home-primary-cta">
              Report an issue
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>

          {errorMessage ? <p className="app-home-citizen-inline-status">{errorMessage}</p> : null}

          <div className="app-home-citizen-secondary-links">
            {citizenFollowUpLinks.map((link) => (
              <Link key={link.to} to={link.to} className="app-home-citizen-secondary-link">
                <span className="app-home-citizen-secondary-title">{link.label}</span>
                <span className="app-home-citizen-secondary-meta">{link.meta}</span>
              </Link>
            ))}
          </div>
        </div>

        <aside className="app-home-citizen-panel" aria-label={statusLabel}>
          {state === 'returning' ? (
            <>
              <div className="app-home-card-head">
                <span className="app-home-icon app-home-icon-muted">
                  <Sparkles size={18} aria-hidden="true" />
                </span>
                <div>
                  <h3>Citizen progress</h3>
                  <p>Use the shared host without repeating the first-run walkthrough.</p>
                </div>
              </div>

              <dl className="app-home-metric-list">
                <div className="app-home-metric">
                  <dt>Reports submitted</dt>
                  <dd>{formatCountLabel(reportsSubmitted, 'report', 'reports')}</dd>
                </div>
                <div className="app-home-metric">
                  <dt>Resolved reports</dt>
                  <dd>{formatCountLabel(reportsResolved, 'report', 'reports')}</dd>
                </div>
                <div className="app-home-metric">
                  <dt>Citizen points</dt>
                  <dd>{formatCountLabel(points, 'point', 'points')}</dd>
                </div>
                <div className="app-home-metric">
                  <dt>Badges earned</dt>
                  <dd>{formatCountLabel(badgesCount, 'badge', 'badges')}</dd>
                </div>
              </dl>
            </>
          ) : (
            <>
              <div className="app-home-card-head">
                <span className="app-home-icon app-home-icon-muted">
                  <Compass size={18} aria-hidden="true" />
                </span>
                <div>
                  <h3>{state === 'first-run' ? 'Before you start' : statusLabel}</h3>
                  <p>
                    {state === 'first-run'
                      ? 'Keep the first report focused and lightweight.'
                      : 'These recovery rules keep the citizen lane usable even when supporting data is unavailable.'}
                  </p>
                </div>
              </div>

              <ul className="app-home-citizen-list">
                {citizenFirstRunChecklist.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>

              <div className="app-home-citizen-subsection">
                <p className="app-home-citizen-subtitle">If something blocks you</p>
                <ul className="app-home-citizen-list app-home-citizen-list-muted">
                  {citizenRecoveryNotes.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </aside>
      </div>
    </section>
  );
}

export default function AppHomePage() {
  const { user } = useCurrentUser();
  const canAccessManager = hasManagerAccess(user);
  const canAccessAgent = hasAgentAccess(user);
  const canAccessCitizen = hasCitizenAccess(user);
  const canAccessAdmin = hasAdminAccess(user);
  const citizenProfileQuery = useCitizenProfile(canAccessCitizen);
  const citizenProfile = ((citizenProfileQuery.data ?? null) as CitizenProfileSnapshot | null);
  const reportsSubmitted = Math.max(0, citizenProfile?.impact?.reportsSubmitted ?? 0);
  const citizenEntryState: CitizenEntryState = !canAccessCitizen
    ? 'unavailable'
    : citizenProfileQuery.isLoading
      ? 'loading'
      : citizenProfileQuery.isError || !citizenProfile
        ? 'unavailable'
        : reportsSubmitted > 0
          ? 'returning'
          : 'first-run';
  const citizenProfileError =
    canAccessCitizen && citizenProfileQuery.isError && citizenProfileQuery.error instanceof Error
      ? citizenProfileQuery.error.message
      : canAccessCitizen && citizenProfileQuery.isError
        ? 'Citizen progress could not be loaded.'
        : null;
  const roleGuides = buildRoleGuides({
    canAccessManager,
    canAccessAgent,
    canAccessCitizen,
    canAccessAdmin,
  });
  const priorityActions = buildPriorityActions({
    canAccessManager,
    canAccessAgent,
    canAccessCitizen,
    canAccessAdmin,
  });
  const roleNames = collectRoleNames(user);
  const firstName = resolveFirstName(user);
  const accessibleSurfaceCount =
    universalLinks.length + roleGuides.reduce((count, guide) => count + guide.links.length, 0);
  const primaryLane = roleGuides[0]?.title ?? 'Shared operations';
  const workspaceSignals = [
    {
      label: 'Default host',
      value: '/app',
    },
    {
      label: 'Accessible surfaces',
      value: `${accessibleSurfaceCount} routes`,
    },
    {
      label: 'Dashboard policy',
      value: canAccessManager ? 'Enabled for this account' : 'Restricted for this account',
    },
  ];
  const operatingRules = [
    {
      title: 'One authenticated host',
      description: 'Every signed-in session lands on /app first, then moves into the correct product lane.',
    },
    {
      title: 'Deep links stay intact',
      description: 'Users requesting a protected route still return to that destination after sign-in.',
    },
    {
      title: 'Live analytics stay gated',
      description: 'Dashboard access remains limited to manager, admin, and super admin accounts.',
    },
  ];

  return (
    <section className="app-home-page app-content-page">
      <div className="app-home-stack">
        {canAccessCitizen ? (
          <CitizenEntrySection
            state={citizenEntryState}
            profile={citizenProfile}
            errorMessage={citizenProfileError}
          />
        ) : null}

        <section className="app-home-command">
          <div className="app-home-command-grid">
            <div className="app-home-command-copy">
              <div className="app-home-badge">
                <House size={14} aria-hidden="true" />
                Workspace Control
              </div>
              <div className="app-home-command-heading">
                <h1>Command your EcoTrack workspace.</h1>
                <p>
                  {firstName}, this is the authenticated operating surface for every EcoTrack
                  user. Use it to enter the right product lane, review what this session can
                  access, and move into work without treating the dashboard as the default home.
                </p>
              </div>
              <div className="app-home-signal-row">
                {workspaceSignals.map((signal) => (
                  <div key={signal.label} className="app-home-signal">
                    <p className="app-home-signal-label">{signal.label}</p>
                    <p className="app-home-signal-value">{signal.value}</p>
                  </div>
                ))}
              </div>
            </div>
            <aside className="app-home-command-panel">
              <div className="app-home-card-head">
                <span className="app-home-icon app-home-icon-muted">
                  <Compass size={18} aria-hidden="true" />
                </span>
                <div>
                  <h2>Session routing</h2>
                  <p>This host is now the controlled launch point for every authenticated user.</p>
                </div>
              </div>

              <dl className="app-home-metric-list">
                <div className="app-home-metric">
                  <dt>Current roles</dt>
                  <dd>{roleNames.length > 0 ? roleNames.join(', ') : 'No explicit role assigned yet.'}</dd>
                </div>
                <div className="app-home-metric">
                  <dt>Primary lane</dt>
                  <dd>{primaryLane}</dd>
                </div>
                <div className="app-home-metric">
                  <dt>Default fallback</dt>
                  <dd>Shared workspace routes</dd>
                </div>
              </dl>
            </aside>
          </div>
        </section>

        <div className="app-home-workspace-grid">
          <section className="app-home-card app-home-card-main">
            <div className="app-home-card-head">
              <span className="app-home-icon">
                <Sparkles size={18} aria-hidden="true" />
              </span>
              <div>
                <h2>Priority actions</h2>
                <p>
                  The workspace starts with stable routes every session can trust, then layers in
                  the highest-value role surfaces your account can access.
                </p>
              </div>
            </div>

            <div className="app-home-action-grid">
              {priorityActions.map((link) => (
                <Link key={link.to} to={link.to} className="app-home-action-card">
                  <div className="app-home-action-title">
                    <span className="app-home-icon app-home-icon-compact">
                      {renderRouteIcon(link.to)}
                    </span>
                    <span>{link.label}</span>
                  </div>
                  <span className="app-home-link-meta">{link.meta}</span>
                  <p>{link.description}</p>
                  <span className="app-home-action-arrow">
                    Launch
                    <ArrowRight size={15} aria-hidden="true" />
                  </span>
                </Link>
              ))}
            </div>
          </section>

          <aside className="app-home-card app-home-card-side">
            <div className="app-home-card-head">
              <span className="app-home-icon app-home-icon-muted">
                <Shield size={18} aria-hidden="true" />
              </span>
              <div>
                <h2>Operating model</h2>
                <p>
                  The shared host keeps workspace routing predictable and keeps protected product
                  surfaces aligned to the right audience.
                </p>
              </div>
            </div>

            <div className="app-home-rule-list">
              {operatingRules.map((rule, index) => (
                <div key={rule.title} className="app-home-rule-item">
                  <span className="app-home-rule-index">0{index + 1}</span>
                  <div>
                    <h3>{rule.title}</h3>
                    <p>{rule.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>

        <section className="app-home-lanes">
          <div className="app-home-section-title">
            <p className="app-home-section-eyebrow">Workspace lanes</p>
            <h2>Role-aware entry points</h2>
            <p>
              Every authenticated user shares one product-grade home, then branches into the
              correct lane from here.
            </p>
          </div>

          {roleGuides.length > 0 ? (
            <div className="app-home-lane-grid">
              {roleGuides.map((guide) => (
                <section key={guide.title} className="app-home-card app-home-lane-card">
                  <div className="app-home-lane-top">
                    <span className="app-home-icon">
                      {renderRouteIcon(guide.links[0]?.to ?? '/app', 18)}
                    </span>
                    <div>
                      <p className="app-home-lane-eyebrow">{guide.eyebrow}</p>
                      <h3>{guide.title}</h3>
                    </div>
                  </div>

                  <p>{guide.description}</p>

                  <div className="app-home-lane-links">
                    {guide.links.map((link) => (
                      <Link key={link.to} to={link.to} className="app-home-action-card app-home-lane-link">
                        <div className="app-home-action-title">
                          <span>{link.label}</span>
                        </div>
                        <span className="app-home-link-meta">{link.meta}</span>
                        <p>{link.description}</p>
                      </Link>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <section className="app-home-card app-home-card-full">
              <h2>Shared workspace only</h2>
              <p className="app-home-empty-copy">
                This account currently uses the common support and settings surfaces only. If
                additional roles are assigned later, their lanes will appear here automatically.
              </p>
            </section>
          )}
        </section>
      </div>
    </section>
  );
}

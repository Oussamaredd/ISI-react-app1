import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appRoot = path.resolve(__dirname, '..');
const pagesRoot = path.join(appRoot, 'src', 'pages');
const adminComponentsRoot = path.join(appRoot, 'src', 'components', 'admin');
const landingComponentsRoot = path.join(appRoot, 'src', 'components', 'landing');

const INLINE_STYLE_PATTERN = /\bstyle=\{/;

const PAGE_FILE_CONTRACTS = {
  'src/pages/AdminDashboard.tsx': {
    requiredSnippets: ['ops-admin-shell'],
    requiredImports: ['styles/OperationsPages.css'],
  },
  'src/pages/AdvancedTicketList.tsx': {
    requiredSnippets: ['advanced-ticket-page'],
    requiredImports: ['styles/AdvancedTicketList.css'],
  },
  'src/pages/AgentTourPage.tsx': {
    requiredSnippets: ['ops-page'],
    requiredImports: ['styles/OperationsPages.css'],
  },
  'src/pages/CitizenChallengesPage.tsx': {
    requiredSnippets: ['ops-page'],
    requiredImports: ['styles/OperationsPages.css'],
  },
  'src/pages/CitizenProfilePage.tsx': {
    requiredSnippets: ['ops-page'],
    requiredImports: ['styles/OperationsPages.css'],
  },
  'src/pages/CitizenReportPage.tsx': {
    requiredSnippets: ['ops-page'],
    requiredImports: ['styles/OperationsPages.css'],
  },
  'src/pages/CreateTickets.tsx': {
    requiredSnippets: ['create-page'],
    requiredImports: ['styles/CreateTickets.css'],
  },
  'src/pages/Dashboard.tsx': {
    requiredSnippets: ['dashboard-page'],
    requiredImports: [],
  },
  'src/pages/ManagerPlanningPage.tsx': {
    requiredSnippets: ['ops-page'],
    requiredImports: ['styles/OperationsPages.css'],
  },
  'src/pages/ManagerReportsPage.tsx': {
    requiredSnippets: ['ops-page'],
    requiredImports: ['styles/OperationsPages.css'],
  },
  'src/pages/SettingsPage.tsx': {
    requiredSnippets: ['app-settings-card'],
    requiredImports: [],
  },
  'src/pages/SupportPage.tsx': {
    requiredSnippets: ['support-workspace-page'],
    requiredImports: ['styles/SupportPage.css', 'styles/TicketList.css', 'styles/CreateTickets.css'],
  },
  'src/pages/TicketDetails.tsx': {
    requiredSnippets: ['ticket-details-'],
    requiredImports: ['styles/TicketWorkflow.css'],
  },
  'src/pages/TicketList.tsx': {
    requiredSnippets: ['list-page'],
    requiredImports: ['styles/TicketList.css'],
  },
  'src/pages/TreatTicketPage.tsx': {
    requiredSnippets: ['ticket-treat-page'],
    requiredImports: ['styles/TicketWorkflow.css'],
  },
};

const PAGE_FOLDER_CONTRACTS = [
  {
    folderPrefix: 'src/pages/auth/',
    requiredSnippets: ['auth-'],
  },
  {
    folderPrefix: 'src/pages/landing/',
    requiredSnippets: ['landing-'],
  },
];

const violations = [];

const toRelativeFromApp = (absolutePath) =>
  path.relative(appRoot, absolutePath).replaceAll('\\', '/');

const toRelativeFromRepo = (absolutePath) =>
  path.relative(path.resolve(appRoot, '..'), absolutePath).replaceAll('\\', '/');

const pushViolation = (relativePath, message) => {
  violations.push(`- ${relativePath}: ${message}`);
};

const collectFilesRecursively = async (absoluteDir, extension) => {
  const entries = await readdir(absoluteDir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const absolutePath = path.join(absoluteDir, entry.name);
      if (entry.isDirectory()) {
        return collectFilesRecursively(absolutePath, extension);
      }

      if (!entry.name.endsWith(extension)) {
        return [];
      }

      return [absolutePath];
    }),
  );

  return files.flat();
};

const getPageContract = (relativePath) => {
  const fileContract = PAGE_FILE_CONTRACTS[relativePath];
  if (fileContract) {
    return fileContract;
  }

  for (const folderContract of PAGE_FOLDER_CONTRACTS) {
    if (relativePath.startsWith(folderContract.folderPrefix)) {
      return folderContract;
    }
  }

  return null;
};

const validateRequiredSnippets = (relativePath, source, requiredSnippets = []) => {
  for (const snippet of requiredSnippets) {
    if (!source.includes(snippet)) {
      pushViolation(relativePath, `missing required theme marker "${snippet}".`);
    }
  }
};

const validateRequiredImports = (relativePath, source, requiredImports = []) => {
  for (const importSnippet of requiredImports) {
    if (!source.includes(importSnippet)) {
      pushViolation(relativePath, `missing required stylesheet import "${importSnippet}".`);
    }
  }
};

const validatePages = async () => {
  const pageFiles = await collectFilesRecursively(pagesRoot, '.tsx');

  for (const absolutePath of pageFiles) {
    const relativePath = toRelativeFromApp(absolutePath);
    const source = await readFile(absolutePath, 'utf8');
    const contract = getPageContract(relativePath);

    if (!contract) {
      pushViolation(
        relativePath,
        'no theme contract configured for this page. Add a contract entry before merging.',
      );
      continue;
    }

    validateRequiredSnippets(relativePath, source, contract.requiredSnippets);
    validateRequiredImports(relativePath, source, contract.requiredImports);
  }
};

const validateAdminComponents = async () => {
  const adminFiles = await collectFilesRecursively(adminComponentsRoot, '.tsx');

  for (const absolutePath of adminFiles) {
    const relativePath = toRelativeFromApp(absolutePath);
    const source = await readFile(absolutePath, 'utf8');
    const fileName = path.basename(absolutePath);
    const isModal = fileName.endsWith('Modal.tsx');

    if (INLINE_STYLE_PATTERN.test(source)) {
      pushViolation(
        relativePath,
        'inline styles are not allowed in admin UI; use EcoTrack theme classes/tokens.',
      );
    }

    if (isModal) {
      validateRequiredSnippets(relativePath, source, [
        'ops-admin-modal-overlay',
        'ops-admin-modal-panel',
      ]);
      continue;
    }

    validateRequiredSnippets(relativePath, source, ['ops-admin-panel']);
  }
};

const validateLandingComponents = async () => {
  const landingFiles = await collectFilesRecursively(landingComponentsRoot, '.tsx');

  for (const absolutePath of landingFiles) {
    const relativePath = toRelativeFromApp(absolutePath);
    const source = await readFile(absolutePath, 'utf8');

    validateRequiredSnippets(relativePath, source, ['landing-']);
  }
};

await Promise.all([validatePages(), validateAdminComponents(), validateLandingComponents()]);

if (violations.length > 0) {
  console.error('UI theme contract validation failed:\n');
  console.error(violations.join('\n'));
  process.exit(1);
}

console.log(
  `UI theme contract validation passed for ${toRelativeFromRepo(pagesRoot)}, ${toRelativeFromRepo(adminComponentsRoot)}, and ${toRelativeFromRepo(landingComponentsRoot)}.`,
);

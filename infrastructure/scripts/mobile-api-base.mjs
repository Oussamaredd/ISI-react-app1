import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const DEFAULT_API_PORT = 3001;
const PROJECT_ROOT = process.cwd();
const MOBILE_ENV_PATH = path.join(PROJECT_ROOT, 'mobile', '.env.local');

const args = process.argv.slice(2);

const readArgValue = (name) => {
  const exactMatch = args.find((arg) => arg.startsWith(`${name}=`));
  if (exactMatch) {
    return exactMatch.slice(name.length + 1);
  }

  const index = args.indexOf(name);
  if (index >= 0 && index < args.length - 1) {
    return args[index + 1];
  }

  return null;
};

const writeEnv = args.includes('--write');
const rawTarget = readArgValue('--target') ?? 'lan';
const target = rawTarget.trim().toLowerCase();
const rawPort = readArgValue('--port');
const apiPort = rawPort ? Number(rawPort) : DEFAULT_API_PORT;

if (!Number.isInteger(apiPort) || apiPort < 1 || apiPort > 65535) {
  console.error(`Invalid API port: ${rawPort}`);
  process.exit(1);
}

const EXCLUDED_INTERFACE_PATTERNS = [
  /loopback/i,
  /virtual/i,
  /docker/i,
  /vbox/i,
  /vmware/i,
  /hyper-v/i,
  /tailscale/i,
  /zerotier/i,
  /wsl/i,
];

const PRIVATE_RANGES = [
  { prefix: '192.168.', score: 0 },
  { prefix: '10.', score: 1 },
];

const parseIpv4Octets = (ipAddress) => ipAddress.split('.').map((segment) => Number(segment));

const isPrivateIpv4 = (ipAddress) => {
  if (PRIVATE_RANGES.some(({ prefix }) => ipAddress.startsWith(prefix))) {
    return true;
  }

  const [firstOctet, secondOctet] = parseIpv4Octets(ipAddress);
  return firstOctet === 172 && secondOctet >= 16 && secondOctet <= 31;
};

const getRangeScore = (ipAddress) => {
  const matchedRange = PRIVATE_RANGES.find(({ prefix }) => ipAddress.startsWith(prefix));
  if (matchedRange) {
    return matchedRange.score;
  }

  const [firstOctet, secondOctet] = parseIpv4Octets(ipAddress);
  if (firstOctet === 172 && secondOctet >= 16 && secondOctet <= 31) {
    return 2;
  }

  return 3;
};

const getLanCandidates = () => {
  const interfaces = os.networkInterfaces();
  const candidates = [];

  for (const [interfaceName, interfaceAddresses] of Object.entries(interfaces)) {
    if (!interfaceAddresses) {
      continue;
    }

    if (EXCLUDED_INTERFACE_PATTERNS.some((pattern) => pattern.test(interfaceName))) {
      continue;
    }

    for (const interfaceAddress of interfaceAddresses) {
      const family =
        typeof interfaceAddress.family === 'string'
          ? interfaceAddress.family
          : interfaceAddress.family === 4
            ? 'IPv4'
            : 'unknown';

      if (family !== 'IPv4' || interfaceAddress.internal) {
        continue;
      }

      const ipAddress = interfaceAddress.address.trim();

      if (!isPrivateIpv4(ipAddress) || ipAddress.startsWith('169.254.')) {
        continue;
      }

      candidates.push({
        interfaceName,
        ipAddress,
        baseUrl: `http://${ipAddress}:${apiPort}`,
      });
    }
  }

  return candidates.sort((left, right) => {
    const rangeScore = getRangeScore(left.ipAddress) - getRangeScore(right.ipAddress);
    if (rangeScore !== 0) {
      return rangeScore;
    }

    return left.interfaceName.localeCompare(right.interfaceName);
  });
};

const lanCandidates = getLanCandidates();
const preferredLanCandidate = lanCandidates[0] ?? null;

const resolveBaseUrl = () => {
  switch (target) {
    case 'lan':
      if (!preferredLanCandidate) {
        throw new Error('No private LAN IPv4 address was detected on this machine.');
      }

      return preferredLanCandidate.baseUrl;
    case 'android-emulator':
      return `http://10.0.2.2:${apiPort}`;
    case 'ios-simulator':
      return `http://localhost:${apiPort}`;
    default:
      throw new Error(
        `Unsupported target "${rawTarget}". Use lan, android-emulator, or ios-simulator.`
      );
  }
};

const upsertEnvValue = (filePath, key, value) => {
  const existingContent = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
  const lines = existingContent.length > 0 ? existingContent.split(/\r?\n/) : [];
  const keyPrefix = `${key}=`;
  let replaced = false;

  const nextLines = lines.map((line) => {
    if (line.startsWith(keyPrefix)) {
      replaced = true;
      return `${key}=${value}`;
    }

    return line;
  });

  if (!replaced) {
    if (nextLines.length > 0 && nextLines[nextLines.length - 1] !== '') {
      nextLines.push('');
    }

    nextLines.push(`${key}=${value}`);
  }

  const normalizedContent = nextLines.join('\n').replace(/\n{3,}/g, '\n\n');
  fs.writeFileSync(filePath, `${normalizedContent.trimEnd()}\n`, 'utf8');
};

const printCandidates = () => {
  console.log('EcoTrack mobile API base helper');
  console.log('');
  console.log(`Target: ${target}`);
  console.log(`API port: ${apiPort}`);
  console.log('');

  if (lanCandidates.length === 0) {
    console.log('No LAN IPv4 candidates detected.');
  } else {
    console.log('Detected LAN IPv4 candidates:');
    for (const candidate of lanCandidates) {
      console.log(`- ${candidate.interfaceName}: ${candidate.baseUrl}`);
    }
  }

  console.log('');
  console.log('Recommended EXPO_PUBLIC_API_BASE_URL values:');
  console.log(`- Physical phone on same Wi-Fi/LAN: ${preferredLanCandidate?.baseUrl ?? 'not detected'}`);
  console.log(`- Android emulator: http://10.0.2.2:${apiPort}`);
  console.log(`- iOS simulator: http://localhost:${apiPort}`);
  console.log('');
  console.log('Notes:');
  console.log('- Expo LAN or tunnel affects the JS bundle, not your backend API URL.');
  console.log('- Physical devices still need a device-reachable API origin.');
  console.log('- The API must be running and Windows Firewall must allow inbound traffic on the API port.');
};

try {
  const resolvedBaseUrl = resolveBaseUrl();
  printCandidates();
  console.log('');
  console.log(`Selected value: ${resolvedBaseUrl}`);

  if (writeEnv) {
    upsertEnvValue(MOBILE_ENV_PATH, 'EXPO_PUBLIC_API_BASE_URL', resolvedBaseUrl);
    console.log(`Updated ${MOBILE_ENV_PATH}`);
  } else {
    console.log('Run with --write to update mobile/.env.local automatically.');
  }
} catch (error) {
  printCandidates();
  console.error('');
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

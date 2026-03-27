import { createHash } from 'node:crypto';

import { Inject, Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from 'redis';

type CacheProfile = 'default' | 'dashboard' | 'planning' | 'analytics' | 'citizen';

type CacheEntry<T> = {
  expiresAt: number;
  namespace: string;
  value: T;
};

type CacheEnvelope<T> = {
  storedAt: string;
  value: T;
};

type CacheMetricsSnapshot = {
  enabled: boolean;
  invalidationsTotal: number;
  maxMemoryEntries: number;
  memoryEntries: number;
  memoryEvictionsTotal: number;
  namespaceCount: number;
  readsByTier: {
    memory: number;
    redis: number;
    source: number;
  };
  redisConnected: boolean;
  redisErrorsTotal: number;
  writesByTier: {
    memory: number;
    redis: number;
  };
};

type CacheGetOrLoadOptions<T> = {
  key: string;
  loader: () => Promise<T>;
  namespace: string;
  profile?: CacheProfile;
  ttlSeconds?: number;
};

const DEFAULT_CACHE_DEFAULT_TTL_SECONDS = 60;
const DEFAULT_CACHE_PREFIX = 'ecotrack';
const DEFAULT_CACHE_MAX_MEMORY_ENTRIES = 250;
const DEFAULT_CACHE_PROFILE_TTLS: Record<Exclude<CacheProfile, 'default'>, number> = {
  dashboard: 30,
  planning: 20,
  analytics: 60,
  citizen: 30,
};

const cloneCacheValue = <T>(value: T): T => {
  try {
    return structuredClone(value);
  } catch {
    return value;
  }
};

@Injectable()
export class CacheService implements OnApplicationShutdown {
  private readonly logger = new Logger(CacheService.name);
  private readonly enabled: boolean;
  private readonly maxMemoryEntries: number;
  private readonly prefix: string;
  private readonly ttlByProfile: Record<CacheProfile, number>;
  private readonly memoryEntries = new Map<string, CacheEntry<unknown>>();
  private readonly namespaceEntryKeys = new Map<string, Set<string>>();
  private readonly namespaceVersions = new Map<string, number>();
  private readonly metrics: CacheMetricsSnapshot;
  private readonly redisUrl: string | null;
  private redisClient: ReturnType<typeof createClient> | null = null;
  private redisConnectionPromise: Promise<void> | null = null;
  private redisReady = false;

  constructor(@Inject(ConfigService) private readonly configService: ConfigService) {
    this.enabled = this.configService.get<boolean>('cache.enabled') ?? true;
    this.prefix = this.configService.get<string>('cache.prefix')?.trim() || DEFAULT_CACHE_PREFIX;
    this.maxMemoryEntries = Math.max(
      1,
      this.configService.get<number>('cache.maxMemoryEntries') ?? DEFAULT_CACHE_MAX_MEMORY_ENTRIES,
    );
    this.redisUrl = this.configService.get<string>('cache.redisUrl')?.trim() || null;
    this.ttlByProfile = {
      default:
        this.configService.get<number>('cache.defaultTtlSeconds') ??
        DEFAULT_CACHE_DEFAULT_TTL_SECONDS,
      dashboard:
        this.configService.get<number>('cache.dashboardTtlSeconds') ??
        DEFAULT_CACHE_PROFILE_TTLS.dashboard,
      planning:
        this.configService.get<number>('cache.planningTtlSeconds') ??
        DEFAULT_CACHE_PROFILE_TTLS.planning,
      analytics:
        this.configService.get<number>('cache.analyticsTtlSeconds') ??
        DEFAULT_CACHE_PROFILE_TTLS.analytics,
      citizen:
        this.configService.get<number>('cache.citizenTtlSeconds') ??
        DEFAULT_CACHE_PROFILE_TTLS.citizen,
    };
    this.metrics = {
      enabled: this.enabled,
      invalidationsTotal: 0,
      maxMemoryEntries: this.maxMemoryEntries,
      memoryEntries: 0,
      memoryEvictionsTotal: 0,
      namespaceCount: 0,
      readsByTier: {
        memory: 0,
        redis: 0,
        source: 0,
      },
      redisConnected: false,
      redisErrorsTotal: 0,
      writesByTier: {
        memory: 0,
        redis: 0,
      },
    };

    if (this.enabled && this.redisUrl) {
      this.initializeRedis();
    }
  }

  getTtlSeconds(profile: CacheProfile = 'default') {
    return this.ttlByProfile[profile];
  }

  getMetricsSnapshot(): CacheMetricsSnapshot {
    return {
      ...this.metrics,
      memoryEntries: this.memoryEntries.size,
      namespaceCount: this.namespaceEntryKeys.size,
      readsByTier: {
        ...this.metrics.readsByTier,
      },
      writesByTier: {
        ...this.metrics.writesByTier,
      },
      redisConnected: this.redisReady,
    };
  }

  async getOrLoad<T>(options: CacheGetOrLoadOptions<T>): Promise<T> {
    if (!this.enabled) {
      return options.loader();
    }

    const namespace = options.namespace.trim();
    const cacheKeyBase = options.key.trim();
    if (!namespace || !cacheKeyBase) {
      return options.loader();
    }

    const ttlSeconds = Math.max(1, options.ttlSeconds ?? this.getTtlSeconds(options.profile));
    const namespaceVersion = await this.getNamespaceVersion(namespace);
    const cacheKey = this.buildCacheKey(namespace, namespaceVersion, cacheKeyBase);
    const memoryEntry = this.getMemoryEntry<T>(cacheKey);

    if (memoryEntry) {
      this.metrics.readsByTier.memory += 1;
      return cloneCacheValue(memoryEntry.value);
    }

    if (await this.hasRedis()) {
      try {
        const cached = await this.redisClient?.get(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached) as CacheEnvelope<T>;
          this.setMemoryEntry(cacheKey, namespace, ttlSeconds, parsed.value);
          this.metrics.readsByTier.redis += 1;
          return cloneCacheValue(parsed.value);
        }
      } catch (error) {
        this.recordRedisError(error, 'read');
      }
    }

    const loadedValue = await options.loader();
    this.metrics.readsByTier.source += 1;
    await this.storeValue(cacheKey, namespace, ttlSeconds, loadedValue);
    return loadedValue;
  }

  async invalidateNamespace(namespace: string) {
    const normalizedNamespace = namespace.trim();
    if (!normalizedNamespace || !this.enabled) {
      return;
    }

    this.metrics.invalidationsTotal += 1;
    this.clearNamespaceEntries(normalizedNamespace);

    if (await this.hasRedis()) {
      try {
        const nextVersion = await this.redisClient?.incr(
          this.buildNamespaceVersionKey(normalizedNamespace),
        );
        this.namespaceVersions.set(normalizedNamespace, Number(nextVersion ?? 0));
        return;
      } catch (error) {
        this.recordRedisError(error, 'invalidate');
      }
    }

    this.namespaceVersions.set(
      normalizedNamespace,
      (this.namespaceVersions.get(normalizedNamespace) ?? 0) + 1,
    );
  }

  async invalidateNamespaces(namespaces: string[]) {
    for (const namespace of new Set(namespaces.map((value) => value.trim()).filter(Boolean))) {
      await this.invalidateNamespace(namespace);
    }
  }

  async onApplicationShutdown() {
    if (!this.redisClient) {
      return;
    }

    try {
      await this.redisClient.quit();
    } catch {
      // Redis is optional. Avoid blocking app shutdown on cache backend teardown.
    }
  }

  private initializeRedis() {
    if (!this.redisUrl || this.redisConnectionPromise) {
      return;
    }

    const client = createClient({ url: this.redisUrl });
    client.on('error', (error) => {
      this.recordRedisError(error, 'runtime');
    });
    client.on('ready', () => {
      this.redisReady = true;
      this.metrics.redisConnected = true;
    });
    client.on('end', () => {
      this.redisReady = false;
      this.metrics.redisConnected = false;
    });

    this.redisClient = client;
    this.redisConnectionPromise = client
      .connect()
      .then(() => undefined)
      .catch((error) => {
        this.recordRedisError(error, 'connect');
        this.redisClient = null;
      })
      .finally(() => {
        this.redisConnectionPromise = null;
      });
  }

  private buildNamespaceVersionKey(namespace: string) {
    return `${this.prefix}:cache:namespace:${namespace}:version`;
  }

  private buildCacheKey(namespace: string, version: number, rawKey: string) {
    const hash = createHash('sha256').update(rawKey).digest('hex');
    return `${this.prefix}:cache:${namespace}:v${version}:${hash}`;
  }

  private clearNamespaceEntries(namespace: string) {
    const existingKeys = this.namespaceEntryKeys.get(namespace);
    if (existingKeys) {
      for (const key of existingKeys) {
        this.memoryEntries.delete(key);
      }
    }

    this.namespaceEntryKeys.delete(namespace);
    this.metrics.memoryEntries = this.memoryEntries.size;
    this.metrics.namespaceCount = this.namespaceEntryKeys.size;
  }

  private getMemoryEntry<T>(cacheKey: string) {
    const existing = this.memoryEntries.get(cacheKey) as CacheEntry<T> | undefined;
    if (!existing) {
      return null;
    }

    if (existing.expiresAt <= Date.now()) {
      this.memoryEntries.delete(cacheKey);
      const namespaceKeys = this.namespaceEntryKeys.get(existing.namespace);
      namespaceKeys?.delete(cacheKey);
      if (namespaceKeys && namespaceKeys.size === 0) {
        this.namespaceEntryKeys.delete(existing.namespace);
      }
      this.metrics.memoryEntries = this.memoryEntries.size;
      this.metrics.namespaceCount = this.namespaceEntryKeys.size;
      return null;
    }

    this.memoryEntries.delete(cacheKey);
    this.memoryEntries.set(cacheKey, existing);
    return existing;
  }

  private async getNamespaceVersion(namespace: string) {
    const localVersion = this.namespaceVersions.get(namespace);
    if (typeof localVersion === 'number') {
      return localVersion;
    }

    if (await this.hasRedis()) {
      try {
        const remoteVersion = await this.redisClient?.get(this.buildNamespaceVersionKey(namespace));
        const parsed = Number(remoteVersion ?? 0);
        const version = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
        this.namespaceVersions.set(namespace, version);
        return version;
      } catch (error) {
        this.recordRedisError(error, 'namespace-version');
      }
    }

    this.namespaceVersions.set(namespace, 0);
    return 0;
  }

  private async hasRedis() {
    if (!this.enabled || !this.redisUrl) {
      return false;
    }

    if (!this.redisClient) {
      this.initializeRedis();
    }

    if (this.redisConnectionPromise) {
      await this.redisConnectionPromise;
    }

    return Boolean(this.redisClient && this.redisReady);
  }

  private recordRedisError(error: unknown, operation: string) {
    this.metrics.redisErrorsTotal += 1;
    if (error instanceof Error) {
      this.logger.warn(`Redis cache ${operation} failed: ${error.message}`);
      return;
    }

    this.logger.warn(`Redis cache ${operation} failed.`);
  }

  private async storeValue<T>(
    cacheKey: string,
    namespace: string,
    ttlSeconds: number,
    value: T,
  ) {
    this.setMemoryEntry(cacheKey, namespace, ttlSeconds, value);

    if (!(await this.hasRedis())) {
      return;
    }

    try {
      const payload: CacheEnvelope<T> = {
        storedAt: new Date().toISOString(),
        value,
      };
      await this.redisClient?.set(cacheKey, JSON.stringify(payload), {
        EX: ttlSeconds,
      });
      this.metrics.writesByTier.redis += 1;
    } catch (error) {
      this.recordRedisError(error, 'write');
    }
  }

  private setMemoryEntry<T>(cacheKey: string, namespace: string, ttlSeconds: number, value: T) {
    const safeValue = cloneCacheValue(value);
    this.memoryEntries.delete(cacheKey);
    this.memoryEntries.set(cacheKey, {
      expiresAt: Date.now() + ttlSeconds * 1000,
      namespace,
      value: safeValue,
    });
    this.metrics.writesByTier.memory += 1;

    const namespaceKeys = this.namespaceEntryKeys.get(namespace) ?? new Set<string>();
    namespaceKeys.add(cacheKey);
    this.namespaceEntryKeys.set(namespace, namespaceKeys);
    this.trimMemoryEntries();

    this.metrics.memoryEntries = this.memoryEntries.size;
    this.metrics.namespaceCount = this.namespaceEntryKeys.size;
  }

  private trimMemoryEntries() {
    while (this.memoryEntries.size > this.maxMemoryEntries) {
      const oldestEntryPair = this.memoryEntries.entries().next().value as
        | [string, CacheEntry<unknown>]
        | undefined;

      if (!oldestEntryPair) {
        return;
      }

      const [oldestKey, oldestEntry] = oldestEntryPair;

      this.memoryEntries.delete(oldestKey);
      const namespaceKeys = this.namespaceEntryKeys.get(oldestEntry.namespace);
      namespaceKeys?.delete(oldestKey);
      if (namespaceKeys && namespaceKeys.size === 0) {
        this.namespaceEntryKeys.delete(oldestEntry.namespace);
      }
      this.metrics.memoryEvictionsTotal += 1;
    }
  }
}

import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { eq, gte, isNull, lt, or } from 'drizzle-orm';
import {
  alertEvents,
  containers,
  eventConnectorExports,
  ingestionEvents,
  measurements,
  sensorDevices,
  type DatabaseClient,
  tickets,
  tours,
  userRoles,
  users,
  validatedEventDeliveries,
  roles,
  zones,
} from 'ecotrack-database';

import { DRIZZLE } from '../../database/database.constants.js';

type DatabaseDependencyCheck =
  | { name: string; status: 'ok' }
  | { name: string; status: 'error'; message: string };

const TELEMETRY_HEALTH_WINDOW_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class HealthService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DatabaseClient,
    private readonly configService: ConfigService,
  ) {}

  async checkDatabase() {
    const telemetryWindowStart = new Date(Date.now() - TELEMETRY_HEALTH_WINDOW_MS);
    const checks = [
      this.runCheck('ticketing.schema', async () => {
        await this.db
          .select({
            id: tickets.id,
            status: tickets.status,
          })
          .from(tickets)
          .limit(1);
      }),
      this.runCheck('auth.schema', async () => {
        await Promise.all([
          this.db
            .select({
              id: users.id,
              email: users.email,
              authProvider: users.authProvider,
              passwordHash: users.passwordHash,
              googleId: users.googleId,
              zoneId: users.zoneId,
              zoneName: zones.name,
            })
            .from(users)
            .leftJoin(zones, eq(users.zoneId, zones.id))
            .limit(1),
          this.db
            .select({
              userId: userRoles.userId,
              roleId: roles.id,
              roleName: roles.name,
            })
            .from(userRoles)
            .innerJoin(roles, eq(userRoles.roleId, roles.id))
            .limit(1),
        ]);
      }),
      this.runCheck('planning.dashboard.schema', async () => {
        await Promise.all([
          this.db
            .select({
              id: containers.id,
              fillLevelPercent: containers.fillLevelPercent,
              status: containers.status,
              zoneId: containers.zoneId,
              zoneName: zones.name,
            })
            .from(containers)
            .leftJoin(zones, eq(containers.zoneId, zones.id))
            .limit(1),
          this.db
            .select({
              id: tours.id,
              zoneId: tours.zoneId,
              scheduledFor: tours.scheduledFor,
            })
            .from(tours)
            .limit(1),
          this.db
            .select({
              id: alertEvents.id,
              severity: alertEvents.severity,
              currentStatus: alertEvents.currentStatus,
              containerCode: containers.code,
              zoneName: zones.name,
            })
            .from(alertEvents)
            .leftJoin(containers, eq(alertEvents.containerId, containers.id))
            .leftJoin(zones, eq(alertEvents.zoneId, zones.id))
            .limit(1),
        ]);
      }),
      this.runCheck('planning.telemetry.schema', async () => {
        await Promise.all([
          this.db
            .select({
              containerId: measurements.containerId,
              measuredAt: measurements.measuredAt,
            })
            .from(measurements)
            .where(gte(measurements.measuredAt, telemetryWindowStart))
            .limit(1),
          this.db
            .select({
              id: sensorDevices.id,
              lastSeenAt: sensorDevices.lastSeenAt,
            })
            .from(sensorDevices)
            .where(or(isNull(sensorDevices.lastSeenAt), lt(sensorDevices.lastSeenAt, telemetryWindowStart)))
            .limit(1),
        ]);
      }),
      this.runCheck('integration.event-connectors.schema', async () => {
        await this.db
          .select({
            id: eventConnectorExports.id,
            processingStatus: eventConnectorExports.processingStatus,
            nextAttemptAt: eventConnectorExports.nextAttemptAt,
          })
          .from(eventConnectorExports)
          .limit(1);
      }),
    ];

    if (this.isIotIngestionEnabled()) {
      checks.push(
        this.runCheck('iot.ingestion.schema', async () => {
          await Promise.all([
            this.db
              .select({
                id: ingestionEvents.id,
                processingStatus: ingestionEvents.processingStatus,
                processingStartedAt: ingestionEvents.processingStartedAt,
              })
              .from(ingestionEvents)
              .limit(1),
            this.db
              .select({
                id: validatedEventDeliveries.id,
                consumerName: validatedEventDeliveries.consumerName,
                processingStatus: validatedEventDeliveries.processingStatus,
                processingStartedAt: validatedEventDeliveries.processingStartedAt,
              })
              .from(validatedEventDeliveries)
              .limit(1),
          ]);
        }),
      );
    }

    const resolvedChecks = await Promise.all(checks);

    const failedCheckNames = resolvedChecks
      .filter((check) => check.status === 'error')
      .map((check) => check.name);

    if (failedCheckNames.length === 0) {
      return {
        status: 'ok' as const,
        checks: resolvedChecks,
      };
    }

    return {
      status: 'error' as const,
      message: `Database readiness checks failed: ${failedCheckNames.join(', ')}`,
      checks: resolvedChecks,
    };
  }

  private isIotIngestionEnabled() {
    return this.configService.get<boolean>('iotIngestion.IOT_INGESTION_ENABLED') ?? true;
  }

  private async runCheck(
    name: string,
    operation: () => Promise<unknown>,
  ): Promise<DatabaseDependencyCheck> {
    try {
      await operation();
      return { name, status: 'ok' };
    } catch (error) {
      return {
        name,
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown database error',
      };
    }
  }
}


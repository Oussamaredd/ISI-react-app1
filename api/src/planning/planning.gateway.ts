import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';

import { AuthService } from '../auth/auth.service.js';
import { UsersService } from '../users/users.service.js';

import { PlanningService, type PlanningStreamEvent } from './planning.service.js';

const WS_KEEPALIVE_INTERVAL_MS = 25_000;
const WS_SNAPSHOT_INTERVAL_MS = 10_000;
const WS_ALLOWED_ORIGINS = (process.env.CORS_ORIGINS ?? process.env.CLIENT_ORIGIN ?? 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

@Injectable()
@WebSocketGateway({
  path: '/api/planning/ws',
  transports: ['websocket'],
  cors: {
    origin: WS_ALLOWED_ORIGINS,
    credentials: true,
  },
})
export class PlanningGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit, OnModuleDestroy
{
  @WebSocketServer() private server!: Server;

  private readonly logger = new Logger(PlanningGateway.name);
  private unsubscribePlanningEvents: (() => void) | null = null;
  private keepaliveInterval: NodeJS.Timeout | null = null;
  private snapshotInterval: NodeJS.Timeout | null = null;

  constructor(
    @Inject(PlanningService)
    private readonly planningService: PlanningService,
    @Inject(AuthService)
    private readonly authService: AuthService,
    @Inject(UsersService)
    private readonly usersService: UsersService,
  ) {}

  onModuleInit() {
    this.unsubscribePlanningEvents = this.planningService.subscribeRealtimeEvents((event) => {
      this.emitEvent(event);
    });

    this.keepaliveInterval = setInterval(() => {
      this.emitEvent(this.planningService.createKeepaliveEvent());
    }, WS_KEEPALIVE_INTERVAL_MS);

    this.snapshotInterval = setInterval(async () => {
      try {
        const snapshotEvent = await this.planningService.getRealtimeDashboardSnapshotEvent();
        this.emitEvent(snapshotEvent);
      } catch {
        this.logger.warn('Failed to publish websocket dashboard snapshot');
      }
    }, WS_SNAPSHOT_INTERVAL_MS);
  }

  onModuleDestroy() {
    if (this.unsubscribePlanningEvents) {
      this.unsubscribePlanningEvents();
      this.unsubscribePlanningEvents = null;
    }

    if (this.keepaliveInterval) {
      clearInterval(this.keepaliveInterval);
      this.keepaliveInterval = null;
    }

    if (this.snapshotInterval) {
      clearInterval(this.snapshotInterval);
      this.snapshotInterval = null;
    }
  }

  async handleConnection(client: Socket) {
    let isAuthorized = false;

    try {
      const token = this.extractWebSocketSessionToken(client);
      if (!token) {
        throw new UnauthorizedException();
      }

      const authUser = this.authService.getAuthUserFromPlanningWebSocketSessionToken(token);
      if (!authUser) {
        throw new UnauthorizedException();
      }

      const dbUser = await this.usersService.ensureUserForAuth(authUser);
      if (!dbUser || dbUser.isActive === false) {
        throw new UnauthorizedException();
      }

      const dbRoles = await this.usersService.getRolesForUser(dbUser.id);
      const canAccessRealtime = this.planningService.hasRealtimeRoleAccess(
        dbUser.role,
        dbRoles.map((role) => role.name),
      );
      if (!canAccessRealtime) {
        throw new UnauthorizedException();
      }

      isAuthorized = true;
      client.data.authUserId = dbUser.id;
      this.planningService.registerWebSocketConnection();
      const snapshotEvent = await this.planningService.getRealtimeDashboardSnapshotEvent();
      this.emitEvent(snapshotEvent, client);
    } catch {
      if (!isAuthorized) {
        this.planningService.registerWebSocketAuthFailure();
      }

      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    if (typeof client.data.authUserId === 'string' && client.data.authUserId.length > 0) {
      this.planningService.unregisterWebSocketConnection();
    }

    delete client.data.authUserId;
  }

  private emitEvent(event: PlanningStreamEvent, targetClient?: Socket) {
    this.planningService.recordEmittedEvent(event.event);

    if (targetClient) {
      targetClient.emit(event.event, event);
      return;
    }

    if (!this.server) {
      return;
    }

    this.server.emit(event.event, event);
  }

  private extractWebSocketSessionToken(client: Socket) {
    const authToken = client.handshake.auth?.sessionToken;
    if (typeof authToken === 'string' && authToken.trim().length > 0) {
      return authToken.trim();
    }

    const queryToken = client.handshake.query?.stream_session;
    if (typeof queryToken === 'string' && queryToken.trim().length > 0) {
      return queryToken.trim();
    }

    return null;
  }
}

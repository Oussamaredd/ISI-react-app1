import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { systemSettings, type DatabaseClient } from 'react-app1-database';
import { DRIZZLE } from '../database/database.constants.js';

const DEFAULT_SETTINGS = {
  user_registration: true,
  default_user_role: 'agent',
  session_timeout: 24 * 60 * 60 * 1000,
  audit_log_retention: 90,
  max_login_attempts: 5,
  password_min_length: 8,
  email_notifications: true,
  maintenance_mode: false,
  site_name: 'Ticket Management System',
  site_description: 'Professional ticket and hotel management platform',
  timezone: 'UTC',
  date_format: 'MM/DD/YYYY',
  currency: 'USD',
};

const SETTINGS_DESCRIPTIONS: Record<string, string> = {
  user_registration: 'Allow user self-registration',
  default_user_role: 'Default role for new users',
  session_timeout: 'Session timeout in milliseconds',
  audit_log_retention: 'Audit log retention in days',
  max_login_attempts: 'Maximum login attempts before lockout',
  password_min_length: 'Minimum password length',
  email_notifications: 'Email notifications enabled',
  maintenance_mode: 'Maintenance mode flag',
  site_name: 'Site name',
  site_description: 'Site description',
  timezone: 'Default timezone',
  date_format: 'Default date format',
  currency: 'Default currency',
};

const PUBLIC_KEYS = new Set(['site_name', 'site_description', 'timezone', 'date_format', 'currency']);

@Injectable()
export class AdminSettingsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DatabaseClient) {}

  async getSettings() {
    await this.ensureDefaults();
    const rows = await this.db.select().from(systemSettings);

    const settings = { ...DEFAULT_SETTINGS } as Record<string, unknown>;
    for (const row of rows) {
      settings[row.key] = row.value;
    }

    return settings;
  }

  async updateSettings(payload: Record<string, unknown>, actorId?: string | null) {
    const updates = this.normalizePayload(payload);
    if (Object.keys(updates).length === 0) {
      throw new BadRequestException('No valid settings provided');
    }

    const now = new Date();

    await this.db.transaction(async (tx) => {
      for (const [key, value] of Object.entries(updates)) {
        await tx
          .insert(systemSettings)
          .values({
            key,
            value,
            description: SETTINGS_DESCRIPTIONS[key] ?? null,
            isPublic: PUBLIC_KEYS.has(key),
            updatedBy: actorId ?? null,
            createdAt: now,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: systemSettings.key,
            set: {
              value,
              updatedBy: actorId ?? null,
              updatedAt: now,
              description: SETTINGS_DESCRIPTIONS[key] ?? null,
              isPublic: PUBLIC_KEYS.has(key),
            },
          });
      }
    });

    return this.getSettings();
  }

  private normalizePayload(payload: Record<string, unknown>) {
    const updates: Record<string, unknown> = {};
    for (const key of Object.keys(DEFAULT_SETTINGS)) {
      if (Object.prototype.hasOwnProperty.call(payload, key)) {
        updates[key] = payload[key];
      }
    }

    return updates;
  }

  private async ensureDefaults() {
    const rows = await this.db.select({ key: systemSettings.key }).from(systemSettings);
    const existingKeys = new Set(rows.map((row) => row.key));

    const now = new Date();
    const inserts = Object.entries(DEFAULT_SETTINGS)
      .filter(([key]) => !existingKeys.has(key))
      .map(([key, value]) => ({
        key,
        value,
        description: SETTINGS_DESCRIPTIONS[key] ?? null,
        isPublic: PUBLIC_KEYS.has(key),
        createdAt: now,
        updatedAt: now,
      }));

    if (inserts.length > 0) {
      await this.db.insert(systemSettings).values(inserts);
    }
  }
}

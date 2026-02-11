import { Injectable } from '@nestjs/common';

import { AdminSettingsRepository } from './admin.settings.repository.js';

@Injectable()
export class AdminSettingsService {
  constructor(private readonly adminSettingsRepository: AdminSettingsRepository) {}

  async getSettings() {
    return this.adminSettingsRepository.getSettings();
  }

  async updateSettings(payload: Record<string, unknown>, actorId?: string | null) {
    return this.adminSettingsRepository.updateSettings(payload, actorId);
  }
}

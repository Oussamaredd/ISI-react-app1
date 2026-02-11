import { Injectable } from '@nestjs/common';

import { AdminRolesRepository } from './admin.roles.repository.js';

@Injectable()
export class AdminRolesService {
  constructor(private readonly adminRolesRepository: AdminRolesRepository) {}

  getAvailablePermissions() {
    return this.adminRolesRepository.getAvailablePermissions();
  }

  async listRoles() {
    return this.adminRolesRepository.listRoles();
  }

  async createRole(payload: { name: string; description?: string; permissions?: string[] }) {
    return this.adminRolesRepository.createRole(payload);
  }

  async updateRole(roleId: string, payload: { name?: string; description?: string; permissions?: string[] }) {
    return this.adminRolesRepository.updateRole(roleId, payload);
  }

  async deleteRole(roleId: string) {
    return this.adminRolesRepository.deleteRole(roleId);
  }
}

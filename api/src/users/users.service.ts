import { Injectable } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types.js';
import { UsersRepository } from './users.repository.js';

type UserFilters = {
  search?: string;
  role?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
};

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async findByEmail(email: string) {
    return this.usersRepository.findByEmail(email);
  }

  async findById(id: string) {
    return this.usersRepository.findById(id);
  }

  async ensureUserForAuth(authUser: AuthUser) {
    return this.usersRepository.ensureUserForAuth(authUser);
  }

  async listUsers(filters: UserFilters = {}) {
    return this.usersRepository.listUsers(filters);
  }

  async getUserWithRoles(id: string) {
    return this.usersRepository.getUserWithRoles(id);
  }

  async getUserWithRolesByEmail(email: string) {
    return this.usersRepository.getUserWithRolesByEmail(email);
  }

  async updateUserStatus(userId: string, isActive: boolean) {
    return this.usersRepository.updateUserStatus(userId, isActive);
  }

  async updateUserRoles(userId: string, roleIds: string[]) {
    return this.usersRepository.updateUserRoles(userId, roleIds);
  }

  async getRolesForUser(userId: string) {
    return this.usersRepository.getRolesForUser(userId);
  }

  async getRolesForUsers(userIds: string[]) {
    return this.usersRepository.getRolesForUsers(userIds);
  }
}

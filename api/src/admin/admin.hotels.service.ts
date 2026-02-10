import { Injectable } from '@nestjs/common';
import { AdminHotelsRepository } from './admin.hotels.repository.js';

@Injectable()
export class AdminHotelsService {
  constructor(private readonly adminHotelsRepository: AdminHotelsRepository) {}

  async listHotels(filters: { search?: string; isAvailable?: boolean; page?: number; limit?: number }) {
    return this.adminHotelsRepository.listHotels(filters);
  }

  async getHotel(id: string) {
    return this.adminHotelsRepository.getHotel(id);
  }

  async createHotel(payload: { name: string; is_available?: boolean }) {
    return this.adminHotelsRepository.createHotel(payload);
  }

  async updateHotel(id: string, payload: { name?: string; is_available?: boolean }) {
    return this.adminHotelsRepository.updateHotel(id, payload);
  }

  async deleteHotel(id: string) {
    return this.adminHotelsRepository.deleteHotel(id);
  }

  async toggleAvailability(id: string) {
    return this.adminHotelsRepository.toggleAvailability(id);
  }

  async getStats() {
    return this.adminHotelsRepository.getStats();
  }

  async getTopHotels(limit = 10) {
    return this.adminHotelsRepository.getTopHotels(limit);
  }
}

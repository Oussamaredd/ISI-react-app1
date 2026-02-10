import { InternalServerErrorException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HotelsController } from '../hotels/hotels.controller.js';

describe('HotelsController', () => {
  const hotelsServiceMock = {
    findAll: vi.fn(),
  };

  let controller: HotelsController;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new HotelsController(hotelsServiceMock as any);
    hotelsServiceMock.findAll.mockResolvedValue([
      { id: 'hotel-1', name: 'Main Hotel' },
      { id: 'hotel-2', name: 'City Hotel' },
    ]);
  });

  it('findAll returns hotels with total count', async () => {
    await expect(controller.findAll()).resolves.toEqual({
      hotels: [
        { id: 'hotel-1', name: 'Main Hotel' },
        { id: 'hotel-2', name: 'City Hotel' },
      ],
      total: 2,
    });
    expect(hotelsServiceMock.findAll).toHaveBeenCalledTimes(1);
  });

  it('findAll throws InternalServerErrorException when service fails', async () => {
    hotelsServiceMock.findAll.mockRejectedValueOnce(new Error('query failed'));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    try {
      await controller.findAll();
      throw new Error('Expected findAll to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(InternalServerErrorException);
      expect((error as InternalServerErrorException).message).toBe('Unable to fetch hotels');
    }

    errorSpy.mockRestore();
  });
});

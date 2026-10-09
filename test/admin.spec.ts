import { describe, expect, it, jest } from '@jest/globals';
import { AdminService } from '../src/modules/admin/admin.service';
import type { AdminRepository } from '../src/modules/admin/admin.repository';
import type { BookingsService } from '../src/modules/bookings/bookings.service';
import type { VenuesService } from '../src/modules/venues/venues.service';

describe('AdminModule', () => {
  it('delegates venue listing to the venues service', async () => {
    const venues = {
      listForAdmin: jest.fn<() => Promise<unknown[]>>().mockResolvedValue([]),
    } as unknown as VenuesService;
    const bookings = {} as BookingsService;
    const service = new AdminService({} as AdminRepository, venues, bookings);

    await expect(service.listVenues()).resolves.toEqual([]);
    expect(venues.listForAdmin).toHaveBeenCalledTimes(1);
  });
});

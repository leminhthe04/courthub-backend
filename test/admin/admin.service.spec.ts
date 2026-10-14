import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { describe, expect, it } from '@jest/globals';
import { AdminService } from '../../src/modules/admin/admin.service';
import type { AdminRepository } from '../../src/modules/admin/admin.repository';
import type { BookingsService } from '../../src/modules/bookings/bookings.service';
import type { VenuesService } from '../../src/modules/venues/venues.service';
import { mockResolved } from '../helpers/mock-http';

describe('AdminService', () => {
  function createService(repository: any = {}) {
    return new AdminService(
      repository as AdminRepository,
      {
        listForAdmin: mockResolved([]),
        reviewVenue: mockResolved('venue'),
      } as unknown as VenuesService,
      { listForAdmin: mockResolved([]) } as unknown as BookingsService,
    );
  }

  it('delegates dashboard lists and venue review', async () => {
    const repository = {
      listUsers: mockResolved(['users']),
      listVenues: mockResolved(['venues']),
    };
    const venues = {
      listForAdmin: mockResolved(['venues']),
      reviewVenue: mockResolved('reviewed'),
    };
    const bookings = { listForAdmin: mockResolved(['bookings']) };
    const service = new AdminService(repository as any, venues as any, bookings as any);

    await expect(service.listUsers()).resolves.toEqual(['users']);
    await expect(service.listVenues()).resolves.toEqual(['venues']);
    await expect(service.listBookings()).resolves.toEqual(['bookings']);
    await expect(service.reviewVenue('v1', 'APPROVED')).resolves.toBe('reviewed');
    expect(venues.reviewVenue).toHaveBeenCalledWith('v1', 'APPROVED');
  });

  it('protects the last active administrator and self-deactivation', async () => {
    const repository = {
      findUser: mockResolved({ id: 'admin-1', role: 'ADMIN', isActive: true }),
      countActiveAdmins: mockResolved(1),
    };
    const service = createService(repository);

    await expect(service.updateUserRole('admin-1', 'PARTNER')).rejects.toThrow(ConflictException);
    await expect(service.updateUserStatus('admin-1', 'admin-1', false)).rejects.toThrow(
      ForbiddenException,
    );
    await expect(service.updateUserStatus('other', 'admin-1', false)).rejects.toThrow(
      ConflictException,
    );
  });

  it('rejects updates for a missing user', async () => {
    const repository = { findUser: mockResolved(undefined) };
    const service = createService(repository);

    await expect(service.updateUserRole('missing', 'CUSTOMER')).rejects.toThrow(NotFoundException);
    await expect(service.updateUserStatus('admin', 'missing', true)).rejects.toThrow(
      NotFoundException,
    );
  });
});

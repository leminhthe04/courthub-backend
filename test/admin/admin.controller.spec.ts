import { describe, expect, it } from '@jest/globals';
import { AdminController } from '../../src/modules/admin/admin.controller';
import { createAuthUser, mockResolved } from '../helpers/mock-http';

describe('AdminController', () => {
  it('delegates every admin endpoint to the service', async () => {
    const admin: any = {
      listUsers: mockResolved(['user']),
      listVenues: mockResolved(['venue']),
      updateUserRole: mockResolved('role'),
      updateUserStatus: mockResolved('status'),
      reviewVenue: mockResolved('reviewed'),
      listBookings: mockResolved(['booking']),
    };
    const controller = new AdminController(admin as any);

    await expect(controller.users()).resolves.toEqual(['user']);
    await expect(controller.venues()).resolves.toEqual(['venue']);
    await expect(
      controller.updateUserRole(createAuthUser({ role: 'ADMIN' }), 'u1', {
        role: 'PARTNER',
      } as any),
    ).resolves.toBe('role');
    await expect(
      controller.updateUserStatus(createAuthUser({ role: 'ADMIN' }), 'u1', { isActive: false }),
    ).resolves.toBe('status');
    await expect(controller.approveVenue('v1')).resolves.toBe('reviewed');
    await expect(controller.rejectVenue('v2')).resolves.toBe('reviewed');
    await expect(controller.bookings()).resolves.toEqual(['booking']);

    expect(admin.updateUserRole).toHaveBeenCalledWith('u1', 'PARTNER');
    expect(admin.updateUserStatus).toHaveBeenCalledWith(
      '0199a111-1111-7111-8111-111111111111',
      'u1',
      false,
    );
    expect(admin.reviewVenue).toHaveBeenNthCalledWith(1, 'v1', 'APPROVED');
    expect(admin.reviewVenue).toHaveBeenNthCalledWith(2, 'v2', 'REJECTED');
  });
});

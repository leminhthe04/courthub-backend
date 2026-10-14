import { describe, expect, it } from '@jest/globals';
import {
  BookingsController,
  PartnerBookingsController,
} from '../../src/modules/bookings/bookings.controller';
import { createAuthUser, mockResolved } from '../helpers/mock-http';

describe('BookingsController', () => {
  it('delegates customer booking endpoints', async () => {
    const bookings: any = {
      create: mockResolved({ booking: 'created' }),
      listMine: mockResolved(['mine']),
      listForPartner: mockResolved(['partner']),
      transition: mockResolved('transitioned'),
    };
    const controller = new BookingsController(bookings as any);
    const user = createAuthUser();

    await expect(controller.create({ courtId: 'court-1' } as any, user)).resolves.toEqual({
      booking: 'created',
    });
    await expect(controller.mine(user)).resolves.toEqual(['mine']);
    expect(bookings.create).toHaveBeenCalledWith({ courtId: 'court-1' }, user);
    expect(bookings.listMine).toHaveBeenCalledWith(user.userId);
  });

  it('delegates partner booking list and transitions', async () => {
    const service: any = {
      listForPartner: mockResolved(['partner']),
      transition: mockResolved('done'),
    };
    const controller = new PartnerBookingsController(service as any);
    const user = createAuthUser({ role: 'PARTNER' });

    await expect(controller.list(user)).resolves.toEqual(['partner']);
    await expect(controller.confirm('b1', user)).resolves.toBe('done');
    await expect(controller.reject('b2', user)).resolves.toBe('done');
    expect(service.transition).toHaveBeenNthCalledWith(1, 'b1', user, 'CONFIRMED');
    expect(service.transition).toHaveBeenNthCalledWith(2, 'b2', user, 'REJECTED');
  });
});

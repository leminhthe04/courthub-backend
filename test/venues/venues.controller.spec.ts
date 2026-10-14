import { describe, expect, it } from '@jest/globals';
import {
  PartnerVenuesController,
  VenuesController,
} from '../../src/modules/venues/venues.controller';
import { createAuthUser, mockResolved } from '../helpers/mock-http';

describe('VenuesController', () => {
  it('delegates public venue and schedule endpoints', async () => {
    const service: any = {
      listPublic: mockResolved(['venues']),
      getPublic: mockResolved('venue'),
      getSchedule: mockResolved('schedule'),
    };
    const controller = new VenuesController(service as any);
    const user = createAuthUser();

    await expect(controller.list({ city: 'Vinh Long' } as any)).resolves.toEqual(['venues']);
    await expect(controller.get('v1')).resolves.toBe('venue');
    await expect(controller.schedule('v1', '2026-10-14', user)).resolves.toBe('schedule');
    expect(service.listPublic).toHaveBeenCalledWith({ city: 'Vinh Long' });
    expect(service.getSchedule).toHaveBeenCalledWith('v1', '2026-10-14', user.userId);
  });

  it('passes null identity for a guest schedule request', async () => {
    const service: any = { getSchedule: mockResolved('schedule') };
    const controller = new VenuesController(service as any);

    await controller.schedule('v1', '2026-10-14', null);
    expect(service.getSchedule).toHaveBeenCalledWith('v1', '2026-10-14', undefined);
  });
});

describe('PartnerVenuesController', () => {
  it('delegates venue, court, and pricing-rule endpoints', async () => {
    const service: any = {
      listOwned: mockResolved(['owned']),
      createVenue: mockResolved('venue'),
      updateVenue: mockResolved('updated-venue'),
      createCourt: mockResolved('court'),
      updateCourt: mockResolved('updated-court'),
      deleteCourt: mockResolved('deleted-court'),
      listPricingRules: mockResolved(['rules']),
      createPricingRule: mockResolved('rule'),
      deletePricingRule: mockResolved('deleted-rule'),
      setPricingRules: mockResolved(['set-rules']),
    };
    const controller = new PartnerVenuesController(service as any);
    const user = createAuthUser({ role: 'PARTNER' });

    await expect(controller.list(user)).resolves.toEqual(['owned']);
    await expect(controller.create(user, { name: 'Arena' } as any)).resolves.toBe('venue');
    await expect(controller.update(user, 'v1', { name: 'Arena 2' })).resolves.toBe('updated-venue');
    await expect(controller.createCourt(user, 'v1', { name: 'Court 1' } as any)).resolves.toBe(
      'court',
    );
    await expect(controller.updateCourt(user, 'c1', { isActive: false })).resolves.toBe(
      'updated-court',
    );
    await expect(controller.deleteCourt(user, 'c1')).resolves.toBe('deleted-court');
    await expect(controller.listPricingRules('v1')).resolves.toEqual(['rules']);
    await expect(
      controller.createPricingRule(user, 'v1', { dayOfWeek: 'MON' } as any),
    ).resolves.toBe('rule');
    await expect(controller.deletePricingRule(user, 'v1', 'r1')).resolves.toBe('deleted-rule');
    await expect(controller.setPricingRules(user, 'v1', { rules: [] } as any)).resolves.toEqual([
      'set-rules',
    ]);

    expect(service.createVenue).toHaveBeenCalledWith(user.userId, { name: 'Arena' });
    expect(service.createCourt).toHaveBeenCalledWith(user.userId, 'v1', { name: 'Court 1' });
    expect(service.updateCourt).toHaveBeenCalledWith(user.userId, 'c1', { isActive: false });
    expect(service.setPricingRules).toHaveBeenCalledWith(user.userId, 'v1', []);
  });
});

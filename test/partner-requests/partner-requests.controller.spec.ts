import { describe, expect, it } from '@jest/globals';
import { PartnerRequestsAdminController } from '../../src/modules/partner-requests/partner-requests-admin.controller';
import { PartnerRequestsController } from '../../src/modules/partner-requests/partner-requests.controller';
import { createAuthUser, mockResolved } from '../helpers/mock-http';

describe('PartnerRequestsController', () => {
  it('delegates customer request endpoints', async () => {
    const service: any = {
      submit: mockResolved('submitted'),
      getMine: mockResolved('mine'),
      listAll: mockResolved(['all']),
      review: mockResolved('reviewed'),
    };
    const controller = new PartnerRequestsController(service as any);
    const user = createAuthUser();

    await expect(controller.submit(user, { message: 'Please review my request' })).resolves.toBe(
      'submitted',
    );
    await expect(controller.mine(user)).resolves.toBe('mine');
    expect(service.submit).toHaveBeenCalledWith(user.userId, 'Please review my request');
    expect(service.getMine).toHaveBeenCalledWith(user.userId);
  });

  it('delegates admin review endpoints', async () => {
    const service: any = {
      listAll: mockResolved(['all']),
      review: mockResolved('reviewed'),
    };
    const controller = new PartnerRequestsAdminController(service as any);
    const user = createAuthUser({ role: 'ADMIN' });

    await expect(controller.list()).resolves.toEqual(['all']);
    await expect(controller.approve('r1', user)).resolves.toBe('reviewed');
    await expect(controller.reject('r2', user)).resolves.toBe('reviewed');
    expect(service.review).toHaveBeenNthCalledWith(1, 'r1', 'APPROVED', user.userId);
    expect(service.review).toHaveBeenNthCalledWith(2, 'r2', 'REJECTED', user.userId);
  });
});

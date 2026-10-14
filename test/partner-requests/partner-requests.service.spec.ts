import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, jest } from '@jest/globals';
import { PartnerRequestsService } from '../../src/modules/partner-requests/partner-requests.service';
import { mockResolved } from '../helpers/mock-http';

describe('PartnerRequestsService', () => {
  it('submits a request for a customer and resubmits rejected requests', async () => {
    const repository = {
      findByUserId: jest
        .fn<(...args: any[]) => Promise<any>>()
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce({ id: 'r1', status: 'REJECTED' }),
      create: mockResolved('created'),
      resubmit: mockResolved('resubmitted'),
    };
    const auth = { findById: mockResolved({ id: 'u1', role: 'CUSTOMER' }) };
    const service = new PartnerRequestsService(repository as any, auth as any);

    await expect(service.submit('u1', '  I want to partner  ')).resolves.toBe('created');
    await expect(service.submit('u1', 'Updated')).resolves.toBe('resubmitted');
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'I want to partner' }),
    );
    expect(repository.resubmit).toHaveBeenCalledWith('r1', 'Updated');
  });

  it('rejects invalid roles and duplicate pending requests', async () => {
    const repository = {
      findByUserId: mockResolved({ id: 'r1', status: 'PENDING' }),
    };
    const auth = { findById: mockResolved({ id: 'u1', role: 'PARTNER' }) };
    const service = new PartnerRequestsService(repository as any, auth as any);
    await expect(service.submit('u1')).rejects.toThrow(ForbiddenException);

    const customerService = new PartnerRequestsService(
      repository as any,
      { findById: mockResolved({ id: 'u1', role: 'CUSTOMER' }) } as any,
    );
    await expect(customerService.submit('u1')).rejects.toThrow(ConflictException);
  });

  it('handles lookup and admin review operations', async () => {
    const repository = {
      findByUserId: mockResolved('mine'),
      listAll: mockResolved(['all']),
      review: mockResolved('reviewed'),
    };
    const service = new PartnerRequestsService(repository as any, {} as any);
    await expect(service.getMine('u1')).resolves.toBe('mine');
    await expect(service.listAll()).resolves.toEqual(['all']);
    await expect(service.review('r1', 'APPROVED', 'admin-1')).resolves.toBe('reviewed');

    const missing = new PartnerRequestsService(
      { review: mockResolved(undefined) } as any,
      {} as any,
    );
    await expect(missing.review('missing', 'REJECTED', 'admin-1')).rejects.toThrow(
      NotFoundException,
    );
  });
});

import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, jest } from '@jest/globals';
import { CategoriesService } from '../src/modules/categories/categories.service';
import type { CategoriesRepository } from '../src/modules/categories/categories.repository';

describe('CategoriesModule', () => {
  it('creates a new category and auto-generates slug when not provided', async () => {
    const mockRepo = {
      findBySlug: jest.fn<(...args: any[]) => Promise<any>>().mockResolvedValue(undefined),
      create: jest.fn<(...args: any[]) => Promise<any>>().mockImplementation(async (values) => ({
        ...values,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
    } as unknown as CategoriesRepository;

    const service = new CategoriesService(mockRepo);
    const result = await service.create({ name: 'Cầu lông' });

    expect(result.name).toBe('Cầu lông');
    expect(result.slug).toBe('cau-long');
    expect(result.isActive).toBe(true);
    expect(mockRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Cầu lông',
        slug: 'cau-long',
        isActive: true,
      }),
    );
  });

  it('rejects category creation with duplicate slug', async () => {
    const mockRepo = {
      findBySlug: jest.fn<(...args: any[]) => Promise<any>>().mockResolvedValue({
        id: 'cat-1',
        name: 'Badminton',
        slug: 'badminton',
      }),
    } as unknown as CategoriesRepository;

    const service = new CategoriesService(mockRepo);
    await expect(service.create({ name: 'Badminton', slug: 'badminton' })).rejects.toThrow(
      ConflictException,
    );
  });

  it('prevents update of category if assigned to existing venues', async () => {
    const mockRepo = {
      findById: jest.fn<(...args: any[]) => Promise<any>>().mockResolvedValue({
        id: 'cat-1',
        name: 'Badminton',
        slug: 'badminton',
      }),
      countVenuesUsingCategory: jest.fn<(...args: any[]) => Promise<number>>().mockResolvedValue(2),
    } as unknown as CategoriesRepository;

    const service = new CategoriesService(mockRepo);
    await expect(service.update('cat-1', { name: 'New Name' })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('updates category when not in use by any venue', async () => {
    const mockRepo = {
      findById: jest.fn<(...args: any[]) => Promise<any>>().mockResolvedValue({
        id: 'cat-1',
        name: 'Pickleball',
        slug: 'pickleball',
      }),
      findBySlug: jest.fn<(...args: any[]) => Promise<any>>().mockResolvedValue(undefined),
      countVenuesUsingCategory: jest.fn<(...args: any[]) => Promise<number>>().mockResolvedValue(0),
      update: jest.fn<(...args: any[]) => Promise<any>>().mockResolvedValue({
        id: 'cat-1',
        name: 'Pickleball Pro',
        slug: 'pickleball-pro',
        isActive: true,
      }),
    } as unknown as CategoriesRepository;

    const service = new CategoriesService(mockRepo);
    const result = await service.update('cat-1', { name: 'Pickleball Pro' });
    expect(result.name).toBe('Pickleball Pro');
  });

  it('prevents deletion of category if assigned to existing venues', async () => {
    const mockRepo = {
      findById: jest.fn<(...args: any[]) => Promise<any>>().mockResolvedValue({
        id: 'cat-1',
        name: 'Badminton',
        slug: 'badminton',
      }),
      countVenuesUsingCategory: jest.fn<(...args: any[]) => Promise<number>>().mockResolvedValue(3),
    } as unknown as CategoriesRepository;

    const service = new CategoriesService(mockRepo);
    await expect(service.delete('cat-1')).rejects.toThrow(BadRequestException);
  });

  it('deletes category when not in use by any venue', async () => {
    const mockRepo = {
      findById: jest.fn<(...args: any[]) => Promise<any>>().mockResolvedValue({
        id: 'cat-1',
        name: 'Pickleball',
        slug: 'pickleball',
      }),
      countVenuesUsingCategory: jest.fn<(...args: any[]) => Promise<number>>().mockResolvedValue(0),
      delete: jest.fn<(...args: any[]) => Promise<any>>().mockResolvedValue({
        id: 'cat-1',
        name: 'Pickleball',
        slug: 'pickleball',
      }),
    } as unknown as CategoriesRepository;

    const service = new CategoriesService(mockRepo);
    const result = await service.delete('cat-1');
    expect(result.id).toBe('cat-1');
  });

  it('throws NotFoundException when deleting non-existent category', async () => {
    const mockRepo = {
      findById: jest.fn<(...args: any[]) => Promise<any>>().mockResolvedValue(undefined),
    } as unknown as CategoriesRepository;

    const service = new CategoriesService(mockRepo);
    await expect(service.delete('non-existent')).rejects.toThrow(NotFoundException);
  });
});

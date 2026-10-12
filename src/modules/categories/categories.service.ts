import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ErrorCode } from '../../common/error-codes';
import { createUuidV7 } from '../../common/uuid';
import { CategoriesRepository } from './categories.repository';
import { CreateCategoryDto, slugify, UpdateCategoryDto } from './dto/category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly repository: CategoriesRepository) {}

  listPublic() {
    return this.repository.list(false);
  }

  listForAdmin() {
    return this.repository.listWithVenueCount();
  }

  async getById(id: string) {
    const category = await this.repository.findById(id);
    if (!category) {
      throw new NotFoundException({
        code: ErrorCode.CATEGORY_NOT_FOUND,
        message: 'Category not found',
      });
    }
    return category;
  }

  async create(dto: CreateCategoryDto) {
    const slug = dto.slug?.trim() || slugify(dto.name);
    const existing = await this.repository.findBySlug(slug);
    if (existing) {
      throw new ConflictException({
        code: ErrorCode.CATEGORY_SLUG_ALREADY_EXISTS,
        message: 'A category with this slug already exists',
      });
    }

    return this.repository.create({
      id: createUuidV7(),
      name: dto.name.trim(),
      slug,
      isActive: dto.isActive ?? true,
    });
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundException({
        code: ErrorCode.CATEGORY_NOT_FOUND,
        message: 'Category not found',
      });
    }

    const inUse = await this.repository.countVenuesUsingCategory(id);
    if (inUse > 0) {
      throw new BadRequestException({
        code: ErrorCode.CATEGORY_IN_USE,
        message: 'Cannot edit sport category because it is assigned to existing venues',
      });
    }

    const nextSlug = dto.slug?.trim() || (dto.name ? slugify(dto.name) : undefined);
    if (nextSlug && nextSlug !== existing.slug) {
      const slugConflict = await this.repository.findBySlug(nextSlug);
      if (slugConflict && slugConflict.id !== id) {
        throw new ConflictException({
          code: ErrorCode.CATEGORY_SLUG_ALREADY_EXISTS,
          message: 'A category with this slug already exists',
        });
      }
    }

    const updated = await this.repository.update(id, {
      name: dto.name?.trim(),
      slug: nextSlug,
      isActive: dto.isActive,
    });

    return updated!;
  }

  async delete(id: string) {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundException({
        code: ErrorCode.CATEGORY_NOT_FOUND,
        message: 'Category not found',
      });
    }

    const inUse = await this.repository.countVenuesUsingCategory(id);
    if (inUse > 0) {
      throw new BadRequestException({
        code: ErrorCode.CATEGORY_IN_USE,
        message: 'Cannot delete sport category because it is assigned to existing venues',
      });
    }

    const deleted = await this.repository.delete(id);
    return deleted!;
  }
}

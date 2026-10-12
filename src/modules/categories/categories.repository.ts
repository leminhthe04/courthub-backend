import { Inject, Injectable } from '@nestjs/common';
import { asc, count, eq } from 'drizzle-orm';
import { DATABASE, type Database } from '../../database/database.module';
import { categories, venues, type Category, type NewCategory } from '../../database/schema';

export type CategoryRecord = Category;
export type CategoryWithVenueCount = Category & {
  venueCount: number;
};

@Injectable()
export class CategoriesRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  list(includeInactive = false): Promise<CategoryRecord[]> {
    if (includeInactive) {
      return this.db.select().from(categories).orderBy(asc(categories.name));
    }
    return this.db
      .select()
      .from(categories)
      .where(eq(categories.isActive, true))
      .orderBy(asc(categories.name));
  }

  async listWithVenueCount(): Promise<CategoryWithVenueCount[]> {
    const rows = await this.db
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
        isActive: categories.isActive,
        createdAt: categories.createdAt,
        updatedAt: categories.updatedAt,
        venueCount: count(venues.id),
      })
      .from(categories)
      .leftJoin(venues, eq(venues.categoryId, categories.id))
      .groupBy(categories.id)
      .orderBy(asc(categories.name));

    return rows.map((row) => ({
      ...row,
      venueCount: Number(row.venueCount ?? 0),
    }));
  }

  async findById(id: string): Promise<CategoryRecord | undefined> {
    const [category] = await this.db
      .select()
      .from(categories)
      .where(eq(categories.id, id))
      .limit(1);
    return category;
  }

  async findBySlug(slug: string): Promise<CategoryRecord | undefined> {
    const [category] = await this.db
      .select()
      .from(categories)
      .where(eq(categories.slug, slug))
      .limit(1);
    return category;
  }

  async create(values: NewCategory): Promise<CategoryRecord> {
    const [category] = await this.db.insert(categories).values(values).returning();
    return category;
  }

  async update(id: string, values: Partial<NewCategory>): Promise<CategoryRecord | undefined> {
    const [category] = await this.db
      .update(categories)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(categories.id, id))
      .returning();
    return category;
  }

  async delete(id: string): Promise<CategoryRecord | undefined> {
    const [category] = await this.db.delete(categories).where(eq(categories.id, id)).returning();
    return category;
  }

  async countVenuesUsingCategory(categoryId: string): Promise<number> {
    const [result] = await this.db
      .select({ count: count() })
      .from(venues)
      .where(eq(venues.categoryId, categoryId));
    return Number(result?.count ?? 0);
  }
}

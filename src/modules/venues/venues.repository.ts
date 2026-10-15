import { Inject, Injectable } from '@nestjs/common';
import { and, asc, desc, eq, gt, ilike, inArray, isNull, lt, or, type SQL } from 'drizzle-orm';
import { DATABASE, type Database } from '../../database/database.module';
import {
  bookings,
  categories,
  courts,
  venuePricingRules,
  venues,
  users,
  type NewCourt,
  type NewVenue,
  type NewVenuePricingRule,
} from '../../database/schema';

export type VenueRecord = typeof venues.$inferSelect & {
  sportType: string;
  categoryName: string;
  categorySlug: string;
};
export type CourtRecord = typeof courts.$inferSelect;
export type VenuePricingRuleRecord = typeof venuePricingRules.$inferSelect;
export type PublicVenueCursor = { id: string };

@Injectable()
export class VenuesRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  private venueSelectFields() {
    return {
      id: venues.id,
      ownerId: venues.ownerId,
      categoryId: venues.categoryId,
      sportType: categories.name,
      categoryName: categories.name,
      categorySlug: categories.slug,
      name: venues.name,
      address: venues.address,
      city: venues.city,
      description: venues.description,
      imageUrl: venues.imageUrl,
      status: venues.status,
      createdAt: venues.createdAt,
      updatedAt: venues.updatedAt,
    };
  }

  listPublic(
    query: { search?: string; categoryId?: string },
    options: { limit: number; cursor?: PublicVenueCursor },
  ) {
    const filters: SQL[] = [eq(venues.status, 'APPROVED'), eq(users.isActive, true)];
    if (query.categoryId) filters.push(eq(venues.categoryId, query.categoryId));
    if (query.search) {
      const search = `%${query.search.trim()}%`;
      filters.push(
        or(ilike(venues.name, search), ilike(venues.address, search), ilike(venues.city, search))!,
      );
    }
    if (options.cursor) {
      filters.push(lt(venues.id, options.cursor.id));
    }

    return this.db
      .select({
        id: venues.id,
        name: venues.name,
        categoryId: venues.categoryId,
        sportType: categories.name,
        categoryName: categories.name,
        categorySlug: categories.slug,
        address: venues.address,
        city: venues.city,
        description: venues.description,
        imageUrl: venues.imageUrl,
        createdAt: venues.createdAt,
      })
      .from(venues)
      .innerJoin(categories, eq(categories.id, venues.categoryId))
      .innerJoin(users, eq(users.id, venues.ownerId))
      .where(and(...filters))
      .orderBy(desc(venues.createdAt), desc(venues.id))
      .limit(options.limit + 1); // get one extra record to check if there are more records after the current page
  }

  async findPublic(id: string): Promise<VenueRecord | undefined> {
    const [venue] = await this.db
      .select(this.venueSelectFields())
      .from(venues)
      .innerJoin(categories, eq(categories.id, venues.categoryId))
      .innerJoin(users, eq(users.id, venues.ownerId))
      .where(and(eq(venues.id, id), eq(venues.status, 'APPROVED'), eq(users.isActive, true)))
      .limit(1);
    return venue;
  }

  async findVenueWithCategory(id: string): Promise<VenueRecord | undefined> {
    const [venue] = await this.db
      .select(this.venueSelectFields())
      .from(venues)
      .innerJoin(categories, eq(categories.id, venues.categoryId))
      .where(eq(venues.id, id))
      .limit(1);
    return venue;
  }

  listCourts(venueId: string) {
    return this.db
      .select()
      .from(courts)
      .where(and(eq(courts.venueId, venueId), isNull(courts.deletedAt)))
      .orderBy(asc(courts.name));
  }

  listPricingRules(venueId: string) {
    return this.db
      .select()
      .from(venuePricingRules)
      .where(eq(venuePricingRules.venueId, venueId))
      .orderBy(asc(venuePricingRules.dayOfWeek), asc(venuePricingRules.startTime));
  }

  async createPricingRule(values: NewVenuePricingRule): Promise<VenuePricingRuleRecord> {
    const [rule] = await this.db.insert(venuePricingRules).values(values).returning();
    return rule;
  }

  async deletePricingRule(
    id: string,
    venueId: string,
  ): Promise<VenuePricingRuleRecord | undefined> {
    const [rule] = await this.db
      .delete(venuePricingRules)
      .where(and(eq(venuePricingRules.id, id), eq(venuePricingRules.venueId, venueId)))
      .returning();
    return rule;
  }

  async setPricingRules(
    venueId: string,
    rules: Array<{
      id: string;
      dayOfWeek: 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN';
      startTime: string;
      endTime: string;
      hourlyRate: number;
    }>,
  ): Promise<VenuePricingRuleRecord[]> {
    return this.db.transaction(async (tx) => {
      await tx.delete(venuePricingRules).where(eq(venuePricingRules.venueId, venueId));
      if (!rules.length) return [];
      return tx
        .insert(venuePricingRules)
        .values(
          rules.map((rule) => ({
            id: rule.id,
            venueId,
            dayOfWeek: rule.dayOfWeek,
            startTime: rule.startTime,
            endTime: rule.endTime,
            hourlyRate: rule.hourlyRate,
          })),
        )
        .returning();
    });
  }

  listScheduleBookings(courtIds: string[], dayStart: Date, dayEnd: Date) {
    return this.db
      .select({
        id: bookings.id,
        courtId: bookings.courtId,
        startAt: bookings.startAt,
        endAt: bookings.endAt,
        status: bookings.status,
        customerId: bookings.customerId,
      })
      .from(bookings)
      .where(
        and(
          inArray(bookings.courtId, courtIds),
          lt(bookings.startAt, dayEnd),
          gt(bookings.endAt, dayStart),
          inArray(bookings.status, ['PENDING', 'AWAITING_PAYMENT', 'CONFIRMED']),
        ),
      );
  }

  async createVenue(values: NewVenue): Promise<VenueRecord> {
    const [venue] = await this.db.insert(venues).values(values).returning();
    const withCategory = await this.findVenueWithCategory(venue.id);
    return withCategory!;
  }

  listOwned(ownerId: string): Promise<VenueRecord[]> {
    return this.db
      .select(this.venueSelectFields())
      .from(venues)
      .innerJoin(categories, eq(categories.id, venues.categoryId))
      .where(eq(venues.ownerId, ownerId))
      .orderBy(desc(venues.createdAt));
  }

  async findOwnedVenue(ownerId: string, id: string): Promise<VenueRecord | undefined> {
    const [venue] = await this.db
      .select(this.venueSelectFields())
      .from(venues)
      .innerJoin(categories, eq(categories.id, venues.categoryId))
      .where(and(eq(venues.id, id), eq(venues.ownerId, ownerId)))
      .limit(1);
    return venue;
  }

  async updateVenue(id: string, values: Partial<NewVenue>): Promise<VenueRecord | undefined> {
    await this.db.update(venues).set(values).where(eq(venues.id, id));
    return this.findVenueWithCategory(id);
  }

  async createCourt(values: NewCourt): Promise<CourtRecord> {
    const [court] = await this.db.insert(courts).values(values).returning();
    return court;
  }

  async findCourtWithOwner(courtId: string) {
    const [row] = await this.db
      .select({ court: courts, ownerId: venues.ownerId })
      .from(courts)
      .innerJoin(venues, eq(venues.id, courts.venueId))
      .where(and(eq(courts.id, courtId), isNull(courts.deletedAt)))
      .limit(1);
    return row;
  }

  async hasFutureBookings(courtId: string, now: Date): Promise<boolean> {
    const [booking] = await this.db
      .select({ id: bookings.id })
      .from(bookings)
      .where(
        and(
          eq(bookings.courtId, courtId),
          gt(bookings.startAt, now),
          inArray(bookings.status, ['PENDING', 'AWAITING_PAYMENT', 'CONFIRMED']),
        ),
      )
      .limit(1);
    return Boolean(booking);
  }

  async updateCourt(courtId: string, values: Partial<NewCourt>): Promise<CourtRecord | undefined> {
    const [court] = await this.db
      .update(courts)
      .set(values)
      .where(eq(courts.id, courtId))
      .returning();
    return court;
  }

  async softDeleteCourt(courtId: string, deletedAt: Date): Promise<CourtRecord | undefined> {
    const [court] = await this.db
      .update(courts)
      .set({ deletedAt, isActive: false, updatedAt: deletedAt })
      .where(and(eq(courts.id, courtId), isNull(courts.deletedAt)))
      .returning();
    return court;
  }

  listForAdmin(): Promise<VenueRecord[]> {
    return this.db
      .select(this.venueSelectFields())
      .from(venues)
      .innerJoin(categories, eq(categories.id, venues.categoryId))
      .orderBy(desc(venues.createdAt));
  }

  async reviewVenue(id: string, status: 'APPROVED' | 'REJECTED'): Promise<VenueRecord | undefined> {
    await this.db.update(venues).set({ status, updatedAt: new Date() }).where(eq(venues.id, id));
    return this.findVenueWithCategory(id);
  }
}

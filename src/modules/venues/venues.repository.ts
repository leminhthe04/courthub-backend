import { Inject, Injectable } from '@nestjs/common';
import { and, asc, desc, eq, gt, ilike, inArray, lt, or, type SQL } from 'drizzle-orm';
import { DATABASE, type Database } from '../../database/database.module';
import {
  bookings,
  courts,
  operatingHours,
  venues,
  type NewCourt,
  type NewOperatingHours,
  type NewVenue,
} from '../../database/schema';

export type VenueRecord = typeof venues.$inferSelect;
export type CourtRecord = typeof courts.$inferSelect;
export type OperatingHoursRecord = typeof operatingHours.$inferSelect;

@Injectable()
export class VenuesRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  listPublic(query: { search?: string; city?: string; sportType?: string }) {
    const filters: SQL[] = [eq(venues.status, 'APPROVED')];
    if (query.city) filters.push(ilike(venues.city, `%${query.city.trim()}%`));
    if (query.sportType) filters.push(ilike(venues.sportType, `%${query.sportType.trim()}%`));
    if (query.search) {
      const search = `%${query.search.trim()}%`;
      filters.push(
        or(ilike(venues.name, search), ilike(venues.address, search), ilike(venues.city, search))!,
      );
    }

    return this.db
      .select({
        id: venues.id,
        name: venues.name,
        sportType: venues.sportType,
        address: venues.address,
        city: venues.city,
        description: venues.description,
        imageUrl: venues.imageUrl,
      })
      .from(venues)
      .where(and(...filters))
      .orderBy(desc(venues.createdAt));
  }

  async findPublic(id: string): Promise<VenueRecord | undefined> {
    const [venue] = await this.db
      .select()
      .from(venues)
      .where(and(eq(venues.id, id), eq(venues.status, 'APPROVED')))
      .limit(1);
    return venue;
  }

  listCourts(venueId: string) {
    return this.db
      .select()
      .from(courts)
      .where(eq(courts.venueId, venueId))
      .orderBy(asc(courts.name));
  }

  listOperatingHours(venueId: string) {
    return this.db
      .select()
      .from(operatingHours)
      .where(eq(operatingHours.venueId, venueId))
      .orderBy(asc(operatingHours.dayOfWeek));
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
          or(eq(bookings.status, 'PENDING'), eq(bookings.status, 'CONFIRMED')),
        ),
      );
  }

  async createVenue(values: NewVenue): Promise<VenueRecord> {
    const [venue] = await this.db.insert(venues).values(values).returning();
    return venue;
  }

  listOwned(ownerId: string) {
    return this.db
      .select()
      .from(venues)
      .where(eq(venues.ownerId, ownerId))
      .orderBy(desc(venues.createdAt));
  }

  async findOwnedVenue(ownerId: string, id: string): Promise<VenueRecord | undefined> {
    const [venue] = await this.db
      .select()
      .from(venues)
      .where(and(eq(venues.id, id), eq(venues.ownerId, ownerId)))
      .limit(1);
    return venue;
  }

  async updateVenue(id: string, values: Partial<NewVenue>): Promise<VenueRecord | undefined> {
    const [venue] = await this.db.update(venues).set(values).where(eq(venues.id, id)).returning();
    return venue;
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
      .where(eq(courts.id, courtId))
      .limit(1);
    return row;
  }

  async updateCourt(courtId: string, values: Partial<NewCourt>): Promise<CourtRecord | undefined> {
    const [court] = await this.db
      .update(courts)
      .set(values)
      .where(eq(courts.id, courtId))
      .returning();
    return court;
  }

  async findOperatingHours(
    venueId: string,
    dayOfWeek: number,
  ): Promise<OperatingHoursRecord | undefined> {
    const [hours] = await this.db
      .select()
      .from(operatingHours)
      .where(and(eq(operatingHours.venueId, venueId), eq(operatingHours.dayOfWeek, dayOfWeek)))
      .limit(1);
    return hours;
  }

  async updateOperatingHours(
    id: string,
    values: Partial<NewOperatingHours>,
  ): Promise<OperatingHoursRecord | undefined> {
    const [hours] = await this.db
      .update(operatingHours)
      .set(values)
      .where(eq(operatingHours.id, id))
      .returning();
    return hours;
  }

  async createOperatingHours(values: NewOperatingHours): Promise<OperatingHoursRecord> {
    const [hours] = await this.db.insert(operatingHours).values(values).returning();
    return hours;
  }

  listForAdmin() {
    return this.db.select().from(venues).orderBy(desc(venues.createdAt));
  }

  async reviewVenue(id: string, status: 'APPROVED' | 'REJECTED'): Promise<VenueRecord | undefined> {
    const [venue] = await this.db
      .update(venues)
      .set({ status, updatedAt: new Date() })
      .where(eq(venues.id, id))
      .returning();
    return venue;
  }
}

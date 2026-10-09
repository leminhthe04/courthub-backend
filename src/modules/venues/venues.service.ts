import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createUuidV7 } from '../../common/uuid';
import {
  CreateCourtDto,
  CreateVenueDto,
  ListVenueDto,
  SetOperatingHoursDto,
  UpdateCourtDto,
} from './dto/venue.dto';
import { VenuesRepository, type VenueRecord } from './venues.repository';

const VIETNAM_TIME_ZONE = 'Asia/Ho_Chi_Minh';

export function startOfVietnamDate(date: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new BadRequestException('date must use YYYY-MM-DD');
  const parsed = new Date(`${date}T00:00:00+07:00`);
  if (Number.isNaN(parsed.getTime())) throw new BadRequestException('Invalid date');
  return parsed;
}

function nextDate(value: Date) {
  return new Date(value.getTime() + 24 * 60 * 60 * 1000);
}

function vietnamDayOfWeek(value: Date) {
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: VIETNAM_TIME_ZONE,
    weekday: 'short',
  }).format(value);
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(weekday);
}

@Injectable()
export class VenuesService {
  constructor(private readonly repository: VenuesRepository) {}

  listPublic(query: ListVenueDto) {
    return this.repository.listPublic(query);
  }

  async getPublic(id: string) {
    const venue = await this.repository.findPublic(id);
    if (!venue) throw new NotFoundException('Venue not found or not approved');
    return this.getVenueAggregate(venue);
  }

  async getVenueAggregate(venue: VenueRecord) {
    const [venueCourts, hours] = await Promise.all([
      this.repository.listCourts(venue.id),
      this.repository.listOperatingHours(venue.id),
    ]);
    return { ...venue, courts: venueCourts, operatingHours: hours };
  }

  async getSchedule(id: string, date: string, currentUserId?: string) {
    const venue = await this.getPublic(id);
    const dayStart = startOfVietnamDate(date);
    const dayEnd = nextDate(dayStart);
    const day = vietnamDayOfWeek(dayStart);
    const activeCourts = venue.courts.filter((court) => court.isActive);
    const courtIds = activeCourts.map((court) => court.id);
    const dayHours = venue.operatingHours.find((item) => item.dayOfWeek === day) ?? null;

    if (!courtIds.length) {
      return {
        venue,
        date,
        timezone: VIETNAM_TIME_ZONE,
        slotMinutes: 30,
        hours: dayHours,
        courts: [],
      };
    }

    const scheduleBookings = await this.repository.listScheduleBookings(courtIds, dayStart, dayEnd);
    return {
      venue,
      date,
      timezone: VIETNAM_TIME_ZONE,
      slotMinutes: 30,
      hours: dayHours,
      courts: activeCourts.map((court) => ({
        ...court,
        bookings: scheduleBookings
          .filter((booking) => booking.courtId === court.id)
          .map((booking) => ({
            id: booking.id,
            startAt: booking.startAt,
            endAt: booking.endAt,
            status: booking.status,
            isMine: Boolean(currentUserId && booking.customerId === currentUserId),
          })),
      })),
    };
  }

  async createVenue(ownerId: string, dto: CreateVenueDto) {
    const venue = await this.repository.createVenue({
      id: createUuidV7(),
      ...dto,
      ownerId,
      status: 'PENDING',
    });
    return this.getVenueAggregate(venue);
  }

  async listOwned(ownerId: string) {
    const owned = await this.repository.listOwned(ownerId);
    return Promise.all(owned.map((venue) => this.getVenueAggregate(venue)));
  }

  async updateVenue(ownerId: string, id: string, dto: Partial<CreateVenueDto>) {
    const venue = await this.requireOwnedVenue(ownerId, id);
    const updated = await this.repository.updateVenue(venue.id, { ...dto, updatedAt: new Date() });
    return this.getVenueAggregate(updated!);
  }

  async createCourt(ownerId: string, venueId: string, dto: CreateCourtDto) {
    await this.requireOwnedVenue(ownerId, venueId);
    return this.repository.createCourt({ id: createUuidV7(), ...dto, venueId });
  }

  async updateCourt(ownerId: string, courtId: string, dto: UpdateCourtDto) {
    const row = await this.repository.findCourtWithOwner(courtId);
    if (!row) throw new NotFoundException('Court not found');
    if (row.ownerId !== ownerId) throw new ForbiddenException('You do not own this court');
    return this.repository.updateCourt(courtId, { ...dto, updatedAt: new Date() });
  }

  async setOperatingHours(
    ownerId: string,
    venueId: string,
    dayOfWeek: number,
    dto: SetOperatingHoursDto,
  ) {
    await this.requireOwnedVenue(ownerId, venueId);
    if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
      throw new BadRequestException('dayOfWeek must be between 0 and 6');
    }

    const aligned = (value?: string) => Boolean(value && Number(value.slice(3, 5)) % 30 === 0);
    if (
      !dto.isClosed &&
      (!dto.openTime ||
        !dto.closeTime ||
        dto.openTime >= dto.closeTime ||
        !aligned(dto.openTime) ||
        !aligned(dto.closeTime))
    ) {
      throw new BadRequestException('Operating hours must use valid 30-minute boundaries');
    }

    const values = {
      isClosed: dto.isClosed,
      openTime: dto.isClosed ? null : dto.openTime,
      closeTime: dto.isClosed ? null : dto.closeTime,
    };
    const existing = await this.repository.findOperatingHours(venueId, dayOfWeek);
    if (existing) return this.repository.updateOperatingHours(existing.id, values);

    return this.repository.createOperatingHours({
      id: createUuidV7(),
      venueId,
      dayOfWeek,
      ...values,
    });
  }

  listForAdmin() {
    return this.repository.listForAdmin();
  }

  async reviewVenue(id: string, status: 'APPROVED' | 'REJECTED') {
    const venue = await this.repository.reviewVenue(id, status);
    if (!venue) throw new NotFoundException('Venue not found');
    return venue;
  }

  private async requireOwnedVenue(ownerId: string, id: string) {
    const venue = await this.repository.findOwnedVenue(ownerId, id);
    if (!venue) throw new ForbiddenException('You do not own this venue');
    return venue;
  }
}

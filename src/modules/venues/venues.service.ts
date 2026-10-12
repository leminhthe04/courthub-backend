import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ErrorCode } from '../../common/error-codes';
import { createUuidV7 } from '../../common/uuid';
import {
  CreateCourtDto,
  CreateVenueDto,
  CreateVenuePricingRuleDto,
  ListVenueDto,
  SetOperatingHoursDto,
  UpdateCourtDto,
} from './dto/venue.dto';
import { VenuesRepository, type VenueRecord } from './venues.repository';

const VIETNAM_TIME_ZONE = 'Asia/Ho_Chi_Minh';

export function clockToMinutes(value: string | null) {
  if (!value) return null;
  const [hour, minute] = value.slice(0, 5).split(':').map(Number);
  return hour * 60 + minute;
}

export function startOfVietnamDate(date: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new BadRequestException({
      code: ErrorCode.VENUE_INVALID_DATE_FORMAT,
      message: 'date must use YYYY-MM-DD',
    });
  }
  const parsed = new Date(`${date}T00:00:00+07:00`);
  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException({
      code: ErrorCode.VENUE_INVALID_DATE,
      message: 'Invalid date',
    });
  }
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
    if (!venue) {
      throw new NotFoundException({
        code: ErrorCode.VENUE_NOT_FOUND,
        message: 'Venue not found or not approved',
      });
    }
    return this.getVenueAggregate(venue);
  }

  async getVenueAggregate(venue: VenueRecord) {
    const [venueCourts, hours, pricingRules] = await Promise.all([
      this.repository.listCourts(venue.id),
      this.repository.listOperatingHours(venue.id),
      this.repository.listPricingRules(venue.id),
    ]);
    return { ...venue, courts: venueCourts, operatingHours: hours, pricingRules };
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
      status: 'APPROVED',
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
    if (!row) {
      throw new NotFoundException({
        code: ErrorCode.BOOKING_COURT_NOT_FOUND,
        message: 'Court not found',
      });
    }
    if (row.ownerId !== ownerId) {
      throw new ForbiddenException({
        code: ErrorCode.VENUE_FORBIDDEN,
        message: 'You do not own this court',
      });
    }
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
      throw new BadRequestException({
        code: ErrorCode.VENUE_DAY_OF_WEEK_INVALID,
        message: 'dayOfWeek must be between 0 and 6',
      });
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
      throw new BadRequestException({
        code: ErrorCode.VENUE_INVALID_OPERATING_HOURS,
        message: 'Operating hours must use valid 30-minute boundaries',
      });
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

  async listPricingRules(venueId: string) {
    return this.repository.listPricingRules(venueId);
  }

  async createPricingRule(ownerId: string, venueId: string, dto: CreateVenuePricingRuleDto) {
    await this.requireOwnedVenue(ownerId, venueId);
    const startMin = clockToMinutes(dto.startTime);
    const endMin = clockToMinutes(dto.endTime);
    if (startMin === null || endMin === null || startMin >= endMin) {
      throw new BadRequestException({
        code: ErrorCode.VENUE_INVALID_PRICING_RULE,
        message: 'startTime must be earlier than endTime',
      });
    }

    const existingRules = await this.repository.listPricingRules(venueId);
    for (const rule of existingRules) {
      const existingStart = clockToMinutes(rule.startTime)!;
      const existingEnd = clockToMinutes(rule.endTime)!;
      if (Math.max(startMin, existingStart) < Math.min(endMin, existingEnd)) {
        throw new BadRequestException({
          code: ErrorCode.VENUE_INVALID_PRICING_RULE,
          message: 'Pricing rule overlaps with an existing rule',
        });
      }
    }

    return this.repository.createPricingRule({
      id: createUuidV7(),
      venueId,
      startTime: dto.startTime,
      endTime: dto.endTime,
      hourlyRate: dto.hourlyRate,
    });
  }

  async deletePricingRule(ownerId: string, venueId: string, ruleId: string) {
    await this.requireOwnedVenue(ownerId, venueId);
    const deleted = await this.repository.deletePricingRule(ruleId, venueId);
    if (!deleted) {
      throw new NotFoundException({
        code: ErrorCode.VENUE_INVALID_PRICING_RULE,
        message: 'Pricing rule not found',
      });
    }
    return deleted;
  }

  async setPricingRules(ownerId: string, venueId: string, rules: CreateVenuePricingRuleDto[]) {
    await this.requireOwnedVenue(ownerId, venueId);
    const parsed = rules.map((r) => ({
      ...r,
      startMin: clockToMinutes(r.startTime)!,
      endMin: clockToMinutes(r.endTime)!,
    }));

    for (const r of parsed) {
      if (r.startMin === null || r.endMin === null || r.startMin >= r.endMin) {
        throw new BadRequestException({
          code: ErrorCode.VENUE_INVALID_PRICING_RULE,
          message: 'Each rule must have startTime before endTime',
        });
      }
    }

    parsed.sort((a, b) => a.startMin - b.endMin);
    for (let i = 0; i < parsed.length - 1; i++) {
      if (parsed[i].endMin > parsed[i + 1].startMin) {
        throw new BadRequestException({
          code: ErrorCode.VENUE_INVALID_PRICING_RULE,
          message: 'Pricing rules cannot overlap',
        });
      }
    }

    return this.repository.setPricingRules(
      venueId,
      parsed.map((r) => ({
        id: createUuidV7(),
        startTime: r.startTime,
        endTime: r.endTime,
        hourlyRate: r.hourlyRate,
      })),
    );
  }

  listForAdmin() {
    return this.repository.listForAdmin();
  }

  async reviewVenue(id: string, status: 'APPROVED' | 'REJECTED') {
    const venue = await this.repository.reviewVenue(id, status);
    if (!venue) {
      throw new NotFoundException({
        code: ErrorCode.VENUE_NOT_FOUND,
        message: 'Venue not found',
      });
    }
    return venue;
  }

  private async requireOwnedVenue(ownerId: string, id: string) {
    const venue = await this.repository.findOwnedVenue(ownerId, id);
    if (!venue) {
      throw new ForbiddenException({
        code: ErrorCode.VENUE_FORBIDDEN,
        message: 'You do not own this venue',
      });
    }
    return venue;
  }
}

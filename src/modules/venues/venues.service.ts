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
  UpdateCourtDto,
} from './dto/venue.dto';
import type { DayOfWeek } from '../../database/schema';
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

export function vietnamDayOfWeek(value: Date): DayOfWeek {
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: VIETNAM_TIME_ZONE,
    weekday: 'short',
  }).format(value);
  const values: Record<string, DayOfWeek> = {
    Mon: 'MON',
    Tue: 'TUE',
    Wed: 'WED',
    Thu: 'THU',
    Fri: 'FRI',
    Sat: 'SAT',
    Sun: 'SUN',
  };
  return values[weekday];
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
    const [venueCourts, pricingRules] = await Promise.all([
      this.repository.listCourts(venue.id),
      this.repository.listPricingRules(venue.id),
    ]);
    return { ...venue, courts: venueCourts, pricingRules };
  }

  async getSchedule(id: string, date: string, currentUserId?: string) {
    let venue: Awaited<ReturnType<typeof this.getVenueAggregate>> | undefined;
    if (currentUserId) {
      const owned = await this.repository.findVenueWithCategory(id);
      if (owned && (owned.ownerId === currentUserId || owned.status === 'APPROVED')) {
        venue = await this.getVenueAggregate(owned);
      }
    }
    if (!venue) {
      venue = await this.getPublic(id);
    }
    const dayStart = startOfVietnamDate(date);
    const dayEnd = nextDate(dayStart);
    const activeCourts = venue.courts.filter((court) => court.isActive);
    const courtIds = activeCourts.map((court) => court.id);

    if (!courtIds.length) {
      return {
        venue,
        date,
        timezone: VIETNAM_TIME_ZONE,
        slotMinutes: 30,
        courts: [],
      };
    }

    const scheduleBookings = await this.repository.listScheduleBookings(courtIds, dayStart, dayEnd);
    return {
      venue,
      date,
      timezone: VIETNAM_TIME_ZONE,
      slotMinutes: 30,
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
      if (rule.dayOfWeek !== dto.dayOfWeek) continue;
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
      dayOfWeek: dto.dayOfWeek,
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

    const grouped = new Map<DayOfWeek, typeof parsed>();
    for (const rule of parsed) {
      const group = grouped.get(rule.dayOfWeek) ?? [];
      group.push(rule);
      grouped.set(rule.dayOfWeek, group);
    }
    for (const group of grouped.values()) {
      group.sort((a, b) => a.startMin - b.startMin);
      for (let i = 0; i < group.length - 1; i++) {
        if (group[i].endMin > group[i + 1].startMin) {
          throw new BadRequestException({
            code: ErrorCode.VENUE_INVALID_PRICING_RULE,
            message: 'Pricing rules cannot overlap on the same day',
          });
        }
      }
    }

    return this.repository.setPricingRules(
      venueId,
      parsed.map((r) => ({
        id: createUuidV7(),
        dayOfWeek: r.dayOfWeek,
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

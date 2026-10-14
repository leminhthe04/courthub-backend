import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthUser } from '../../common/auth.types';
import { ErrorCode } from '../../common/error-codes';
import { dayOfWeekFromDate } from '../../common/day-of-week';
import { createUuidV7 } from '../../common/uuid';
import { bookingWindowError, clockToMinutes, localDate, minutesInVietnam } from './booking-rules';
import { BookingsRepository, type BookingRecord } from './bookings.repository';
import { CreateBookingDto } from './dto/booking.dto';

function normalizePhone(value: string) {
  return value.replace(/[\s().-]/g, '');
}

function publicBooking(booking: BookingRecord) {
  return {
    id: booking.id,
    courtId: booking.courtId,
    customerId: booking.customerId,
    contactName: booking.contactName,
    contactEmail: booking.contactEmail,
    contactPhone: booking.contactPhone,
    startAt: booking.startAt,
    endAt: booking.endAt,
    status: booking.status,
    totalAmount: booking.totalAmount,
    note: booking.note,
    createdAt: booking.createdAt,
  };
}

@Injectable()
export class BookingsService {
  constructor(private readonly repository: BookingsRepository) {}

  async create(dto: CreateBookingDto, user: AuthUser | null) {
    const start = new Date(dto.startAt);
    const end = new Date(dto.endAt);
    const windowError = bookingWindowError(start, end);
    if (windowError) throw new BadRequestException(windowError);

    const durationMinutes = (end.getTime() - start.getTime()) / 60000;

    const court = await this.repository.findCourtForBooking(dto.courtId);
    if (!court) {
      throw new NotFoundException({
        code: ErrorCode.BOOKING_COURT_NOT_FOUND,
        message: 'Court not found',
      });
    }
    if (!court.courtActive || court.venueStatus !== 'APPROVED') {
      throw new BadRequestException({
        code: ErrorCode.BOOKING_COURT_UNAVAILABLE,
        message: 'Court is not available for booking',
      });
    }

    const dayOfWeek = dayOfWeekFromDate(new Date(`${localDate(start)}T12:00:00+07:00`));
    const startMinutes = minutesInVietnam(start);

    const contactPhone = normalizePhone(dto.contactPhone ?? user?.phone ?? '');
    if (!contactPhone) {
      throw new BadRequestException({
        code: ErrorCode.BOOKING_PHONE_REQUIRED,
        message: 'Phone number is required before booking',
      });
    }
    if (!dto.contactName?.trim()) {
      throw new BadRequestException({
        code: ErrorCode.BOOKING_GUEST_NAME_REQUIRED,
        message: 'Contact name is required before booking',
      });
    }

    const pricingRules = await this.repository.findPricingRules(court.venueId, dayOfWeek);
    if (!pricingRules.length) {
      throw new BadRequestException({
        code: ErrorCode.BOOKING_NO_PRICING_RULE,
        message: 'Venue has no pricing rules configured',
      });
    }

    const slotCount = durationMinutes / 30;
    let totalCost = 0;
    for (let i = 0; i < slotCount; i++) {
      const slotStart = startMinutes + i * 30;
      const slotEnd = slotStart + 30;
      const rule = pricingRules.find((r) => {
        const rStart = clockToMinutes(r.startTime);
        const rEnd = clockToMinutes(r.endTime);
        return rStart !== null && rEnd !== null && rStart <= slotStart && slotEnd <= rEnd;
      });
      if (!rule) {
        throw new BadRequestException({
          code: ErrorCode.BOOKING_NO_PRICING_RULE,
          message: 'No pricing rule configured for the requested time slot',
        });
      }
      totalCost += Number(rule.hourlyRate) * 0.5;
    }

    const totalAmount = Number(totalCost.toFixed(2));

    try {
      const created = await this.repository.create({
        id: createUuidV7(),
        courtId: court.id,
        customerId: user?.userId ?? null,
        contactName: dto.contactName.trim(),
        contactEmail: dto.contactEmail?.trim() || null,
        contactPhone,
        startAt: start,
        endAt: end,
        status: 'CONFIRMED',
        totalAmount,
        note: dto.note?.trim() || null,
      });
      if (!created) {
        throw new ConflictException({
          code: ErrorCode.BOOKING_SLOT_ALREADY_BOOKED,
          message: 'This time slot is already booked',
        });
      }
      return { booking: publicBooking(created) };
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === '23P01' || code === '23505') {
        throw new ConflictException({
          code: ErrorCode.BOOKING_SLOT_ALREADY_BOOKED,
          message: 'This time slot was just booked by another customer',
        });
      }
      throw error;
    }
  }

  listMine(userId: string) {
    return this.repository.listMine(userId);
  }

  listForPartner(userId: string) {
    return this.repository.listForPartner(userId);
  }

  async transition(id: string, user: AuthUser, status: 'CONFIRMED' | 'REJECTED') {
    const row = await this.repository.findForTransition(id);
    if (!row) {
      throw new NotFoundException({
        code: ErrorCode.BOOKING_NOT_FOUND,
        message: 'Booking not found',
      });
    }
    if (user.role !== 'ADMIN' && row.ownerId !== user.userId) {
      throw new ForbiddenException({
        code: ErrorCode.BOOKING_FORBIDDEN,
        message: 'You cannot manage this booking',
      });
    }
    if (row.booking.status !== 'PENDING') {
      throw new BadRequestException({
        code: ErrorCode.BOOKING_NOT_PENDING,
        message: 'Only PENDING bookings can be managed',
      });
    }

    const updated = await this.repository.transition(id, status);
    return publicBooking(updated!);
  }

  listForAdmin() {
    return this.repository.listForAdmin();
  }
}

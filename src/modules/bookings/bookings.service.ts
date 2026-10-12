import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import type { AuthUser } from '../../common/auth.types';
import { ErrorCode } from '../../common/error-codes';
import { createUuidV7 } from '../../common/uuid';
import { bookingWindowError } from './booking-rules';
import { BookingsRepository, type BookingRecord } from './bookings.repository';
import { CancelBookingDto, CreateBookingDto } from './dto/booking.dto';

const VIETNAM_TIME_ZONE = 'Asia/Ho_Chi_Minh';

function normalizePhone(value: string) {
  return value.replace(/[\s().-]/g, '');
}

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function localDate(value: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: VIETNAM_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(value);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function minutesInVietnam(value: Date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: VIETNAM_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(value);
  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? 0);
  const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? 0);
  return hour * 60 + minute;
}

function clockToMinutes(value: string | null) {
  if (!value) return null;
  const [hour, minute] = value.slice(0, 5).split(':').map(Number);
  return hour * 60 + minute;
}

function publicBooking(booking: BookingRecord) {
  return {
    id: booking.id,
    courtId: booking.courtId,
    customerId: booking.customerId,
    guestName: booking.guestName,
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
    if (
      minutesInVietnam(start) % 30 !== 0 ||
      minutesInVietnam(end) % 30 !== 0 ||
      durationMinutes % 30 !== 0
    ) {
      throw new BadRequestException({
        code: ErrorCode.BOOKING_SLOT_ALIGNMENT_REQUIRED,
        message: 'Time must align to 30-minute slots',
      });
    }

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

    const dayOfWeek = new Date(`${localDate(start)}T12:00:00+07:00`).getUTCDay();
    const hours = await this.repository.findOperatingHours(court.venueId, dayOfWeek);
    const startMinutes = minutesInVietnam(start);
    const endMinutes = minutesInVietnam(end);
    const openMinutes = clockToMinutes(hours?.openTime ?? null);
    const closeMinutes = clockToMinutes(hours?.closeTime ?? null);
    if (
      !hours ||
      hours.isClosed ||
      openMinutes === null ||
      closeMinutes === null ||
      startMinutes < openMinutes ||
      endMinutes > closeMinutes
    ) {
      throw new BadRequestException({
        code: ErrorCode.BOOKING_OUTSIDE_OPERATING_HOURS,
        message: 'Booking is outside venue operating hours',
      });
    }

    const isGuest = !user;
    const contactPhone = normalizePhone(dto.contactPhone ?? user?.phone ?? '');
    if (!contactPhone) {
      throw new BadRequestException({
        code: ErrorCode.BOOKING_PHONE_REQUIRED,
        message: 'Phone number is required before booking',
      });
    }
    if (isGuest && !dto.guestName?.trim()) {
      throw new BadRequestException({
        code: ErrorCode.BOOKING_GUEST_NAME_REQUIRED,
        message: 'Guest name is required before booking',
      });
    }

    const guestToken = isGuest ? randomBytes(24).toString('hex') : null;
    const totalAmount = Number((court.hourlyRate * (durationMinutes / 60)).toFixed(2));

    try {
      const created = await this.repository.create({
        id: createUuidV7(),
        courtId: court.id,
        customerId: user?.userId ?? null,
        guestName: isGuest ? dto.guestName!.trim() : null,
        contactPhone,
        guestTokenHash: guestToken ? hashToken(guestToken) : null,
        startAt: start,
        endAt: end,
        status: 'PENDING',
        totalAmount,
        note: dto.note?.trim() || null,
      });
      return { booking: publicBooking(created), guestToken };
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

  async cancel(id: string, user: AuthUser | null, dto: CancelBookingDto) {
    const booking = await this.repository.findById(id);
    if (!booking) {
      throw new NotFoundException({
        code: ErrorCode.BOOKING_NOT_FOUND,
        message: 'Booking not found',
      });
    }
    if (booking.status === 'CANCELLED' || booking.status === 'REJECTED') {
      throw new BadRequestException({
        code: ErrorCode.BOOKING_ALREADY_ENDED,
        message: 'Booking has already ended',
      });
    }

    if (user) {
      if (booking.customerId !== user.userId) {
        throw new ForbiddenException({
          code: ErrorCode.BOOKING_FORBIDDEN,
          message: 'You do not own this booking',
        });
      }
    } else if (
      !dto.guestToken ||
      !booking.guestTokenHash ||
      hashToken(dto.guestToken) !== booking.guestTokenHash
    ) {
      throw new UnauthorizedException({
        code: ErrorCode.BOOKING_INVALID_GUEST_TOKEN,
        message: 'Invalid guest token',
      });
    }

    const cancelled = await this.repository.cancel(id);
    return publicBooking(cancelled!);
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

import { describe, expect, it } from '@jest/globals';
import { ErrorCode } from '../../src/common/error-codes';
import {
  bookingWindowError,
  clockToMinutes,
  localDate,
  minutesInVietnam,
} from '../../src/modules/bookings/booking-rules';

describe('Booking rules', () => {
  it('normalizes Vietnam local date and clock values', () => {
    const value = new Date('2026-10-14T05:30:00.000Z');
    expect(localDate(value)).toBe('2026-10-14');
    expect(minutesInVietnam(value)).toBe(750);
    expect(clockToMinutes('12:30:00')).toBe(750);
    expect(clockToMinutes(null)).toBeNull();
  });

  it('rejects invalid, reversed, cross-day, and unaligned windows', () => {
    expect(bookingWindowError(new Date('invalid'), new Date())).toMatchObject({
      code: ErrorCode.BOOKING_INVALID_TIME_WINDOW,
    });
    expect(
      bookingWindowError(
        new Date('2026-10-14T08:00:00+07:00'),
        new Date('2026-10-14T07:00:00+07:00'),
      ),
    ).toMatchObject({ code: ErrorCode.BOOKING_SAME_DAY_REQUIRED });
    expect(
      bookingWindowError(
        new Date('2026-10-14T23:30:00+07:00'),
        new Date('2026-10-15T00:30:00+07:00'),
      ),
    ).toMatchObject({ code: ErrorCode.BOOKING_SAME_DAY_REQUIRED });
    expect(
      bookingWindowError(
        new Date('2026-10-14T08:15:00+07:00'),
        new Date('2026-10-14T09:00:00+07:00'),
      ),
    ).toMatchObject({ code: ErrorCode.BOOKING_SLOT_ALIGNMENT_REQUIRED });
  });
});

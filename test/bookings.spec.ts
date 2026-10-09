import { describe, expect, it } from '@jest/globals';
import { bookingWindowError } from '../src/modules/bookings/booking-rules';

describe('BookingsModule', () => {
  it('accepts a 90-minute booking aligned to 30-minute slots', () => {
    const start = new Date('2026-10-09T07:30:00+07:00');
    const end = new Date('2026-10-09T09:00:00+07:00');

    expect(bookingWindowError(start, end)).toBeNull();
  });

  it('rejects a booking starting at 15 minutes past the hour', () => {
    const start = new Date('2026-10-09T07:15:00+07:00');
    const end = new Date('2026-10-09T09:00:00+07:00');

    expect(bookingWindowError(start, end)).toBeTruthy();
  });

  it('rejects a booking that crosses a local calendar day', () => {
    const start = new Date('2026-10-09T23:30:00+07:00');
    const end = new Date('2026-10-10T00:30:00+07:00');

    expect(bookingWindowError(start, end)).toBeTruthy();
  });
});

import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from '@jest/globals';
import { startOfVietnamDate } from '../src/modules/venues/venues.service';

describe('VenuesModule', () => {
  it('converts a local Vietnam date to the start of that day', () => {
    expect(startOfVietnamDate('2026-10-09').toISOString()).toBe('2026-10-08T17:00:00.000Z');
  });

  it('rejects dates that do not use the YYYY-MM-DD format', () => {
    expect(() => startOfVietnamDate('09-10-2026')).toThrow(BadRequestException);
  });
});

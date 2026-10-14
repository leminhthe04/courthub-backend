import { ErrorCode } from '../../common/error-codes';

const VIETNAM_TIME_ZONE = 'Asia/Ho_Chi_Minh';

// Booking slots are aligned to 30-minute boundaries in Vietnam time.

export function localDate(value: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: VIETNAM_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(value);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function minutesInVietnam(value: Date) {
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

export function clockToMinutes(value: string | null) {
  if (!value) return null;
  const [hour, minute] = value.slice(0, 5).split(':').map(Number);
  return hour * 60 + minute;
}

export function bookingWindowError(
  start: Date,
  end: Date,
): { code: ErrorCode; message: string } | null {
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return {
      code: ErrorCode.BOOKING_INVALID_TIME_WINDOW,
      message: 'Khoảng thời gian không hợp lệ',
    };
  }
  if (start >= end || localDate(start) !== localDate(end)) {
    return {
      code: ErrorCode.BOOKING_SAME_DAY_REQUIRED,
      message: 'Booking phải nằm trong cùng một ngày',
    };
  }
  const durationMinutes = (end.getTime() - start.getTime()) / 60000;
  if (
    minutesInVietnam(start) % 30 !== 0 ||
    minutesInVietnam(end) % 30 !== 0 ||
    durationMinutes % 30 !== 0
  ) {
    return {
      code: ErrorCode.BOOKING_SLOT_ALIGNMENT_REQUIRED,
      message: 'Thời gian phải nằm trên mốc 30 phút',
    };
  }
  return null;
}

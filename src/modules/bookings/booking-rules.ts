const VIETNAM_TIME_ZONE = 'Asia/Ho_Chi_Minh';

// Booking slots are aligned to 30-minute boundaries in Vietnam time.

function localDate(value: Date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: VIETNAM_TIME_ZONE }).format(value);
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

export function bookingWindowError(start: Date, end: Date): string | null {
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()))
    return 'Khoảng thời gian không hợp lệ';
  if (start >= end || localDate(start) !== localDate(end))
    return 'Booking phải nằm trong cùng một ngày';
  const durationMinutes = (end.getTime() - start.getTime()) / 60000;
  if (
    minutesInVietnam(start) % 30 !== 0 ||
    minutesInVietnam(end) % 30 !== 0 ||
    durationMinutes % 30 !== 0
  ) {
    return 'Thời gian phải nằm trên mốc 30 phút';
  }
  return null;
}

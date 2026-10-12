import type { DayOfWeek } from '../database/schema';

export function dayOfWeekFromDate(value: Date): DayOfWeek {
  const days: DayOfWeek[] = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  return days[value.getUTCDay()];
}

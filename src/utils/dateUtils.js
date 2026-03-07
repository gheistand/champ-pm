import { startOfWeek, addDays, format, parseISO, isValid } from 'date-fns';

export function getWeekStart(date = new Date()) {
  return startOfWeek(typeof date === 'string' ? parseISO(date) : date, { weekStartsOn: 1 });
}

export function getWeekDates(weekStart) {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

export function getWorkWeekDates(weekStart) {
  return Array.from({ length: 5 }, (_, i) => addDays(weekStart, i));
}

export function toISODate(date) {
  return format(date, 'yyyy-MM-dd');
}

export function formatDisplayDate(date) {
  const d = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(d)) return '';
  return format(d, 'MMM d, yyyy');
}

export function formatWeekRange(weekStart) {
  const d = typeof weekStart === 'string' ? parseISO(weekStart) : weekStart;
  const weekEnd = addDays(d, 6);
  return `${format(d, 'MMM d')} – ${format(weekEnd, 'MMM d, yyyy')}`;
}

export function formatShortDate(date) {
  const d = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(d)) return '';
  return format(d, 'EEE M/d');
}

export function getCurrentWeekStart() {
  return getWeekStart(new Date());
}

export function addWeeks(weekStart, n) {
  return addDays(weekStart, n * 7);
}

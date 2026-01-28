import dayjs from 'dayjs';
import { WEEKDAY_ORDER } from './scheduleGenerator';
import type { EventType, ScheduleEvent, Weekday } from './scheduleGenerator';

export interface ExceptionEvent {
  date: string;
  ministryName: string;
  type: EventType;
  note?: string;
}

const STORAGE_KEY = 'appescalas-exceptions';

const canUseStorage = () => typeof window !== 'undefined' && window.localStorage;

export const loadExceptions = (): ExceptionEvent[] => {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => typeof item.date === 'string' && typeof item.ministryName === 'string');
  } catch (error) {
    console.warn('Failed to read exceptions from storage', error);
    return [];
  }
};

export const saveExceptions = (exceptions: ExceptionEvent[]): void => {
  if (!canUseStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(exceptions));
};

const getWeekdayFromDate = (date: string): Weekday => {
  const parsed = dayjs(date);
  return WEEKDAY_ORDER[parsed.day()];
};

export const mergeScheduleWithExceptions = (
  events: ScheduleEvent[],
  exceptions: ExceptionEvent[]
): ScheduleEvent[] => {
  const map = new Map<string, ScheduleEvent>();
  events.forEach((event) => map.set(event.date, { ...event }));

  exceptions.forEach((exception) => {
    const weekday = getWeekdayFromDate(exception.date);
    map.set(exception.date, {
      date: exception.date,
      weekday,
      ministryName: exception.ministryName,
      type: exception.type,
      note: exception.note,
    });
  });

  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
};

import dayjs, { type Dayjs } from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';

dayjs.extend(isSameOrBefore);

export type Weekday = 'DOM' | 'SEG' | 'TER' | 'QUA' | 'QUI' | 'SEX' | 'SAB';
export type EventType = 'regular' | 'extra';

export interface ScheduleConfig {
  year: number;
  ministries: string[];
  activeWeekdays: Weekday[];
  fifthSundayMinistry: string;
}

export interface ScheduleEvent {
  date: string;
  weekday: Weekday;
  ministryName: string;
  type: EventType;
  note?: string;
}

export const WEEKDAY_ORDER: Weekday[] = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];

type DayjsLike = Dayjs;

const normalizeWeekdays = (weekdays: Weekday[] | undefined) => {
  return (weekdays ?? [])
    .map((day) => day.toUpperCase() as Weekday)
    .filter((day) => WEEKDAY_ORDER.includes(day));
};

const normalizeMinistries = (ministries: string[]) => {
  const filtered = ministries.map((name) => name.trim()).filter(Boolean);
  return filtered.length ? filtered : ['Ministerio'];
};

const getWeekdayKey = (date: DayjsLike): Weekday => WEEKDAY_ORDER[date.day()];

const applyFifthSundayRule = (events: ScheduleEvent[], ministry: string): ScheduleEvent[] => {
  if (!ministry) return events;
  const sundayCount = new Map<string, number>();
  return events.map((event) => {
    if (event.weekday !== 'DOM') return event;
    const monthKey = event.date.slice(0, 7);
    const next = (sundayCount.get(monthKey) ?? 0) + 1;
    sundayCount.set(monthKey, next);
    if (next === 5) {
      return { ...event, ministryName: ministry };
    }
    return event;
  });
};

export const generateYearSchedule = (config: ScheduleConfig): ScheduleEvent[] => {
  const normalizedWeekdays = normalizeWeekdays(config.activeWeekdays);
  if (!normalizedWeekdays.length) return [];

  const ministries = normalizeMinistries(config.ministries);
  const start = dayjs(`${config.year}-01-01`);
  const end = dayjs(`${config.year}-12-31`);
  const events: ScheduleEvent[] = [];
  let rotationIndex = 0;

  for (let current = start; current.isSameOrBefore(end, 'day'); current = current.add(1, 'day')) {
    const weekday = getWeekdayKey(current);
    if (!normalizedWeekdays.includes(weekday)) continue;

    const ministryName = ministries[rotationIndex % ministries.length];
    events.push({
      date: current.format('YYYY-MM-DD'),
      weekday,
      ministryName,
      type: 'regular',
    });
    rotationIndex += 1;
  }

  return applyFifthSundayRule(events, config.fifthSundayMinistry);
};


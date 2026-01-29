import dayjs, { type Dayjs } from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';

dayjs.extend(isSameOrBefore);

export type Weekday = 'DOM' | 'SEG' | 'TER' | 'QUA' | 'QUI' | 'SEX' | 'SAB';
export type EventType = 'regular' | 'extra';

export interface Ministry {
  id: string;
  name: string;
}

export interface ScheduleConfig {
  year: number;
  ministries: Ministry[];
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

const normalizeMinistries = (ministries: Ministry[]) => {
  const filtered = ministries.map((ministry) => ministry.name.trim()).filter(Boolean);
  return filtered.length ? filtered : ['Ministerio'];
};

const getWeekdayKey = (date: DayjsLike): Weekday => WEEKDAY_ORDER[date.day()];

const buildWeeklyMinistries = (year: number, ministries: string[], fifthSundayMinistry: string) => {
  const start = dayjs(`${year}-01-01`).startOf('week');
  const lastSunday = dayjs(`${year}-12-31`).startOf('week');
  const weekMinistryMap = new Map<string, string>();
  const sundayCountByMonth = new Map<string, number>();
  let rotationIndex = 0;

  for (let current = start; current.isSameOrBefore(lastSunday, 'day'); current = current.add(1, 'week')) {
    const monthKey = current.format('YYYY-MM');
    const nextCount = (sundayCountByMonth.get(monthKey) ?? 0) + 1;
    sundayCountByMonth.set(monthKey, nextCount);
    const isFifth = nextCount === 5 && fifthSundayMinistry.trim().length;
    const ministryName = isFifth
      ? fifthSundayMinistry
      : ministries[rotationIndex % ministries.length];
    rotationIndex += 1;
    weekMinistryMap.set(current.format('YYYY-MM-DD'), ministryName);
  }

  return weekMinistryMap;
};

export const generateYearSchedule = (config: ScheduleConfig): ScheduleEvent[] => {
  const normalizedWeekdays = normalizeWeekdays(config.activeWeekdays);
  if (!normalizedWeekdays.length) return [];

  const ministries = normalizeMinistries(config.ministries);
  const weeklyMinistries = buildWeeklyMinistries(config.year, ministries, config.fifthSundayMinistry);
  const start = dayjs(`${config.year}-01-01`);
  const end = dayjs(`${config.year}-12-31`);
  const events: ScheduleEvent[] = [];

  for (let current = start; current.isSameOrBefore(end, 'day'); current = current.add(1, 'day')) {
    const weekday = getWeekdayKey(current);
    if (!normalizedWeekdays.includes(weekday)) continue;
    const sundayKey = current.startOf('week').format('YYYY-MM-DD');
    const ministryName = weeklyMinistries.get(sundayKey);
    if (!ministryName) continue;
    events.push({
      date: current.format('YYYY-MM-DD'),
      weekday,
      ministryName,
      type: 'regular',
    });
  }

  return events;
};


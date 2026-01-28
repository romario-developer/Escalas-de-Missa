import { describe, expect, it } from 'vitest';
import { generateYearSchedule } from './scheduleGenerator';
import { mergeScheduleWithExceptions } from './exceptionsStore';

describe('schedule generator', () => {
  it('rotates ministries across the year without resetting per month', () => {
    const events = generateYearSchedule({
      year: 2026,
      ministries: ['Arcanjos', 'Viver é Cristo', 'Ágape'],
      activeWeekdays: ['DOM', 'TER', 'QUI'],
      fifthSundayMinistry: '',
    });

    const firstSix = events.slice(0, 6).map((event) => event.ministryName);

    expect(firstSix).toEqual([
      'Arcanjos',
      'Viver é Cristo',
      'Ágape',
      'Arcanjos',
      'Viver é Cristo',
      'Ágape',
    ]);
  });

  it('applies the configured ministry on the 5th Sunday of the month', () => {
    const events = generateYearSchedule({
      year: 2026,
      ministries: ['Equipe A', 'Equipe B'],
      activeWeekdays: ['DOM'],
      fifthSundayMinistry: 'Joias de Cristo',
    });

    const fifthSunday = events.find((event) => event.date === '2026-08-30');
    expect(fifthSunday).toBeDefined();
    expect(fifthSunday?.ministryName).toBe('Joias de Cristo');
  });

  it('lets exceptions override any date and add new events', () => {
    const base = generateYearSchedule({
      year: 2026,
      ministries: ['Arcanjos', 'Viver é Cristo'],
      activeWeekdays: ['DOM'],
      fifthSundayMinistry: '',
    });

    const overrides = mergeScheduleWithExceptions(base, [
      {
        date: '2026-01-04',
        ministryName: 'Especial',
        type: 'extra',
        note: 'Celebração familiar',
      },
      {
        date: '2026-01-02',
        ministryName: 'Sábado Extra',
        type: 'extra',
        note: 'Missa preparatória',
      },
    ]);

    const sunday = overrides.find((event) => event.date === '2026-01-04');
    expect(sunday).toBeDefined();
    expect(sunday?.ministryName).toBe('Especial');
    expect(sunday?.type).toBe('extra');

    const saturday = overrides.find((event) => event.date === '2026-01-02');
    expect(saturday).toBeDefined();
    expect(saturday?.weekday).toBe('SEX');
    expect(saturday?.note).toBe('Missa preparatória');
  });
});

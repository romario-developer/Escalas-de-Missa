import { describe, expect, it } from 'vitest';
import { generateYearSchedule } from './scheduleGenerator';
import { mergeScheduleWithExceptions } from './exceptionsStore';

describe('schedule generator', () => {
  it('rotates ministries only on Sundays and keeps Tuesday/Thursday aligned', () => {
    const events = generateYearSchedule({
      year: 2026,
      ministries: ['Arcanjos', 'Viver é Cristo', 'Ágape'],
      activeWeekdays: ['DOM', 'TER', 'QUI'],
      fifthSundayMinistry: '',
    });

    const sundayMinistries = events
      .filter((event) => event.weekday === 'DOM')
      .slice(0, 6)
      .map((event) => event.ministryName);

    const cycle = ['Arcanjos', 'Viver é Cristo', 'Ágape'];
    const offset = cycle.indexOf(sundayMinistries[0]);
    expect(offset).not.toBe(-1);
    const expected = Array.from({ length: sundayMinistries.length }, (_, index) => {
      return cycle[(index + offset) % cycle.length];
    });
    expect(sundayMinistries).toEqual(expected);

    const weekEvents = ['2026-01-04', '2026-01-06', '2026-01-08'].map((date) =>
      events.find((event) => event.date === date)
    );

    const ministry = weekEvents[0]?.ministryName;
    expect(ministry).toBeDefined();
    weekEvents.forEach((event) => {
      expect(event?.ministryName).toBe(ministry);
    });
  });

  it('applies the configured ministry on the 5th Sunday and keeps week alignment', () => {
    const events = generateYearSchedule({
      year: 2026,
      ministries: ['Equipe A', 'Equipe B'],
      activeWeekdays: ['DOM', 'TER', 'QUI'],
      fifthSundayMinistry: 'Joias de Cristo',
    });

    const fifthSunday = events.find((event) => event.date === '2026-08-30');
    expect(fifthSunday).toBeDefined();
    expect(fifthSunday?.ministryName).toBe('Joias de Cristo');

    ['2026-08-30', '2026-09-01', '2026-09-03'].forEach((date) => {
      const weekEvent = events.find((event) => event.date === date);
      expect(weekEvent).toBeDefined();
      expect(weekEvent?.ministryName).toBe('Joias de Cristo');
    });
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

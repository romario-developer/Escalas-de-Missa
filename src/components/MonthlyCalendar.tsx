import dayjs from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import { WEEKDAY_ORDER, type ScheduleEvent } from '../domain/scheduleGenerator';

interface MonthlyCalendarProps {
  year: number;
  month: number;
  events: ScheduleEvent[];
  onDayClick: (date: string, event?: ScheduleEvent) => void;
}

type MonthlyViewMode = 'calendar' | 'agenda';

const pad = (value: number) => value.toString().padStart(2, '0');
const STORAGE_KEY = 'calendarMobileViewMode';

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 640);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 640);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return isMobile;
};

const MobileCalendarToggle = ({
  mode,
  onChange,
}: {
  mode: MonthlyViewMode;
  onChange: (next: MonthlyViewMode) => void;
}) => (
  <div className="mobile-calendar-toggle">
    <div className="mobile-toggle-label">Visualização</div>
    <div className="segmented-control small">
      <button type="button" className={mode === 'calendar' ? 'active' : ''} onClick={() => onChange('calendar')}>
        Calendário
      </button>
      <button type="button" className={mode === 'agenda' ? 'active' : ''} onClick={() => onChange('agenda')}>
        Agenda
      </button>
    </div>
  </div>
);

const createCalendarCells = (year: number, month: number) => {
  const monthString = pad(month);
  const first = dayjs(`${year}-${monthString}-01`);
  const daysInMonth = first.daysInMonth();
  const startWeekday = first.day();
  const totalCells = Math.ceil((daysInMonth + startWeekday) / 7) * 7;
  return { cells: Array.from({ length: totalCells }, (_, index) => index), startWeekday, daysInMonth };
};

const CalendarGridView = ({
  year,
  month,
  events,
  onDayClick,
}: MonthlyCalendarProps) => {
  const { cells, startWeekday, daysInMonth } = createCalendarCells(year, month);
  const eventsByDate = new Map(events.map((event) => [event.date, event]));

  return (
    <div className="calendarScroll">
      <div className="calendar-grid">
        <div className="weekdays">
          {WEEKDAY_ORDER.map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>
        <div className="day-grid">
          {cells.map((cellIndex) => {
            const dayNumber = cellIndex - startWeekday + 1;
            const inMonth = dayNumber >= 1 && dayNumber <= daysInMonth;
            const dateKey =
              inMonth && dayNumber !== null ? [year, pad(month), pad(dayNumber)].join('-') : null;
            const event = dateKey ? eventsByDate.get(dateKey) : undefined;
            return (
              <div
                key={`${year}-${month}-cell-${cellIndex}`}
                className={`day-cell ${!inMonth ? 'inactive' : ''}`}
                onClick={() => {
                  if (!inMonth || !dateKey) return;
                  onDayClick(dateKey, event);
                }}
              >
                <span className="day-number">{inMonth ? dayNumber : ''}</span>
                {event && (
                  <>
                    <span className="event-weekday">{event.weekday}</span>
                    <span className="event-ministry mobile-clamp">{event.ministryName}</span>
                    {event.note && <small className="event-note">{event.note}</small>}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const AgendaListView = ({
  year,
  month,
  events,
  onDayClick,
}: MonthlyCalendarProps) => {
  const start = dayjs(`${year}-${pad(month)}-01`);
  const daysInMonth = start.daysInMonth();
  const eventsByDate = new Map(events.map((event) => [event.date, event]));
  const [showOnlyWithMass, setShowOnlyWithMass] = useState(true);

  const allDays = useMemo(
    () =>
      Array.from({ length: daysInMonth }, (_, index) => {
        const date = start.add(index, 'day');
        const key = date.format('YYYY-MM-DD');
        return { date, key, event: eventsByDate.get(key) };
      }),
    [daysInMonth, eventsByDate, start]
  );

  const filteredDays = showOnlyWithMass ? allDays.filter((item) => item.event) : allDays;

  const handleAddExtra = () => {
    const defaultDate = start.format('YYYY-MM-DD');
    const picked = window.prompt('Informe a data (YYYY-MM-DD):', defaultDate);
    if (picked) {
      onDayClick(picked);
    }
  };

  return (
    <div className="agenda-list-wrapper">
      <div className="agenda-list-controls">
        <div className="checkbox-wrapper">
          <input
            id="agenda-filter"
            type="checkbox"
            checked={showOnlyWithMass}
            onChange={(event) => setShowOnlyWithMass(event.target.checked)}
          />
          <label htmlFor="agenda-filter">Mostrar apenas dias com missa</label>
        </div>
        <button type="button" className="button secondary fullWidth" onClick={handleAddExtra}>
          + Missa extra
        </button>
      </div>
      <div className="agenda-list">
        {filteredDays.map(({ date, key, event }) => {
          const weekday = date.format('ddd').toUpperCase();
          return (
            <button
              key={key}
              type="button"
              className={`agenda-item ${event ? '' : 'agenda-empty'}`}
              onClick={() => onDayClick(key, event)}
            >
              <div className="agenda-header">
                <span className="agenda-date">{date.format('ddd, DD/MM')}</span>
                <span className={`agenda-badge ${event?.weekday === 'DOM' ? 'agenda-badge-dom' : ''}`}>
                  {event?.weekday ?? weekday}
                </span>
              </div>
              {event ? (
                <div className="agenda-content">
                  <span className="agenda-ministry">{event.ministryName}</span>
                  {event.note && <small className="agenda-note">{event.note}</small>}
                </div>
              ) : (
                <small className="agenda-empty-text">Sem missa</small>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const MonthlyCalendar = ({ year, month, events, onDayClick }: MonthlyCalendarProps) => {
  const isMobile = useIsMobile();
  const [mode, setMode] = useState<MonthlyViewMode>('calendar');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem(STORAGE_KEY);
    setMode(saved === 'agenda' ? 'agenda' : 'calendar');
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  if (isMobile) {
    return (
      <div>
        <MobileCalendarToggle mode={mode} onChange={setMode} />
        {mode === 'calendar' ? (
          <CalendarGridView year={year} month={month} events={events} onDayClick={onDayClick} />
        ) : (
          <AgendaListView year={year} month={month} events={events} onDayClick={onDayClick} />
        )}
      </div>
    );
  }

  return <CalendarGridView year={year} month={month} events={events} onDayClick={onDayClick} />;
};

export default MonthlyCalendar;

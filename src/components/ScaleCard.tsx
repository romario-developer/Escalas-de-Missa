import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import dayjs from 'dayjs';
import { toPng } from 'html-to-image';
import { WEEKDAY_ORDER, type Weekday } from '../domain/scheduleGenerator';
import { type ScheduleEvent } from '../domain/scheduleGenerator';

export type ScaleCardHandle = {
  exportCard: () => Promise<void>;
};

type ScaleCardView = 'calendar' | 'scale';
type ScaleWeekday = 'DOM' | 'TER' | 'QUI';

type CalendarCell = {
  dayNumber: number | null;
  date: string | null;
  weekday: Weekday;
  event?: ScheduleEvent;
};

interface ScaleCardProps {
  year: number;
  month: number;
  events: ScheduleEvent[];
  onExportStateChange?: (isExporting: boolean) => void;
}

const SCALE_CARD_VIEW_KEY = 'scaleCardView';
const SCALE_WEEKDAYS: ScaleWeekday[] = ['DOM', 'TER', 'QUI'];

const pad = (value: number) => value.toString().padStart(2, '0');

const getInitialView = (): ScaleCardView => {
  if (typeof window === 'undefined') return 'calendar';
  const stored = window.localStorage.getItem(SCALE_CARD_VIEW_KEY);
  return stored === 'scale' ? 'scale' : 'calendar';
};

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
  mode: ScaleCardView;
  onChange: (next: ScaleCardView) => void;
}) => (
  <div className="mobile-calendar-toggle">
    <div className="mobile-toggle-label">Visualização</div>
    <div className="segmented-control small">
      <button type="button" className={mode === 'calendar' ? 'active' : ''} onClick={() => onChange('calendar')}>
        Calendário
      </button>
      <button type="button" className={mode === 'scale' ? 'active' : ''} onClick={() => onChange('scale')}>
        Escala
      </button>
    </div>
  </div>
);

const buildCalendarMatrix = (
  year: number,
  month: number,
  eventsByDate: Map<string, ScheduleEvent>
): CalendarCell[][] => {
  const monthString = pad(month);
  const firstDay = dayjs(`${year}-${monthString}-01`);
  const daysInMonth = firstDay.daysInMonth();
  const startWeekday = firstDay.day();
  const totalCells = Math.ceil((daysInMonth + startWeekday) / 7) * 7;
  const cells: CalendarCell[] = Array.from({ length: totalCells }, (_, index) => {
    const dayNumber = index - startWeekday + 1;
    const inMonth = dayNumber >= 1 && dayNumber <= daysInMonth;
    const dateKey = inMonth ? `${year}-${monthString}-${pad(dayNumber)}` : null;
    return {
      dayNumber: inMonth ? dayNumber : null,
      date: dateKey,
      weekday: WEEKDAY_ORDER[index % 7],
      event: dateKey ? eventsByDate.get(dateKey) : undefined,
    };
  });
  const weeks: CalendarCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
};

const ScaleCard = forwardRef<ScaleCardHandle, ScaleCardProps>(
  ({ year, month, events, onExportStateChange }, ref) => {
    const previewRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [view, setView] = useState<ScaleCardView>(() => getInitialView());
  const isMobile = useIsMobile();
  const updateExportingState = useCallback(
    (value: boolean) => {
      setIsExporting(value);
      onExportStateChange?.(value);
    },
    [onExportStateChange]
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(SCALE_CARD_VIEW_KEY, view);
  }, [view]);

  const monthName = dayjs(`${year}-${pad(month)}-01`).format('MMMM').toUpperCase();

  const sortedEvents = useMemo(
    () => [...events].sort((a, b) => a.date.localeCompare(b.date)),
    [events]
  );

  const eventsByDate = useMemo(
    () => new Map(sortedEvents.map((event) => [event.date, event])),
    [sortedEvents]
  );

  const scaleGroups = useMemo(() => {
    const groups: Record<ScaleWeekday, ScheduleEvent[]> = {
      DOM: [],
      TER: [],
      QUI: [],
    };
    sortedEvents.forEach((event) => {
      if (SCALE_WEEKDAYS.includes(event.weekday as ScaleWeekday)) {
        groups[event.weekday as ScaleWeekday].push(event);
      }
    });
    SCALE_WEEKDAYS.forEach((weekday) => {
      groups[weekday].sort((a, b) => a.date.localeCompare(b.date));
    });
    return groups;
  }, [sortedEvents]);

  const weeks = useMemo(() => buildCalendarMatrix(year, month, eventsByDate), [year, month, eventsByDate]);

  const helpTextMap: Record<ScaleCardView, string> = {
    calendar: 'Mostra o mês completo (DOM–SAB). Ideal para leitura geral.',
    scale: 'Mostra apenas dias de missa em colunas (DOM/TER/QUI). Ideal para escala objetiva.',
  };

  const exportCard = useCallback(async () => {
    const target = exportRef.current;
    if (!target) return;
    try {
      updateExportingState(true);
      await document.fonts.ready;
      const dataUrl = await toPng(target, {
        pixelRatio: 3,
        cacheBust: true,
        backgroundColor: '#fffaf4',
      });
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `escala-${monthName.toLowerCase()}-${year}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Falha ao gerar imagem', error);
    } finally {
      updateExportingState(false);
    }
  }, [monthName, year, updateExportingState]);

  useImperativeHandle(ref, () => ({ exportCard }), [exportCard]);

  const renderCalendarView = () => (
    <div className="scale-card-calendar">
      <div className="scale-card-calendar-scroll-inner">
        <div className="calendar-weekdays">
          {WEEKDAY_ORDER.map((weekday) => (
            <span key={weekday}>{weekday}</span>
          ))}
        </div>
        <div className="calendar-weeks">
          {weeks.map((week, index) => (
            <div key={`week-${index}`} className="calendar-week">
              {week.map((cell, cellIndex) => (
                <div
                  key={`${index}-${cellIndex}`}
                  className={`calendar-cell ${cell.dayNumber ? '' : 'calendar-cell-empty'} ${
                    cell.weekday === 'DOM' ? 'calendar-cell-dom' : ''
                  }`}
                >
                  {cell.dayNumber && (
                    <span className="calendar-day-number">{pad(cell.dayNumber)}</span>
                  )}
                  {cell.event && (
                    <div className="calendar-event">
                      <span className="calendar-event-ministry">
                        {cell.event.ministryName}
                      </span>
                      {cell.event.note && (
                        <small className="calendar-event-note">{cell.event.note}</small>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderScaleView = () => (
    <div className="scale-mode-grid">
      {SCALE_WEEKDAYS.map((weekday) => (
        <div key={weekday} className="scale-mode-column">
          <div className="scale-mode-column-header">{weekday}</div>
          <div className="scale-mode-column-items">
            {scaleGroups[weekday].length ? (
              scaleGroups[weekday].map((event) => (
                <div
                  key={event.date}
                  className={`scale-mode-item ${weekday === 'DOM' ? 'scale-mode-item-sunday' : ''}`}
                >
                  <strong>{dayjs(event.date).format('DD')}</strong>
                  <span className="scale-mode-item-ministry">{event.ministryName}</span>
                  {event.note && (
                    <small className="scale-mode-item-note">{event.note}</small>
                  )}
                </div>
              ))
            ) : (
              <div className="scale-mode-empty">-</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  const CardContent = ({ showControl }: { showControl: boolean }) => (
    <div className="scale-card-wrapper">
      <div className="scale-card-header">
        <h3>ESCALA MISSA</h3>
        <span>
          {monthName} {year}
        </span>
      </div>
      <div className="scale-divisor" />
      {showControl && isMobile && (
        <div className="scale-card-control">
          <MobileCalendarToggle mode={view} onChange={setView} />
          <p className="scale-card-help">{helpTextMap[view]}</p>
        </div>
      )}
      {view === 'calendar' ? renderCalendarView() : renderScaleView()}
    </div>
  );

  const hintKey = 'scaleCardScrollHintSeen';
  const [showScrollHint, setShowScrollHint] = useState(false);
  const hintTimer = useRef<number | null>(null);

  useEffect(() => {
    const node = previewRef.current;
    if (!node || !isMobile) {
      setShowScrollHint(false);
      return;
    }
    const seen =
      typeof window !== 'undefined' && window.localStorage.getItem(hintKey) === '1';
    if (seen) {
      setShowScrollHint(false);
      return;
    }
    const hasOverflow = node.scrollWidth > node.clientWidth + 4;
    if (!hasOverflow) {
      setShowScrollHint(false);
      return;
    }

    const markHintSeen = () => {
      setShowScrollHint(false);
      if (typeof window !== 'undefined') window.localStorage.setItem(hintKey, '1');
    };

    setShowScrollHint(true);
    if (hintTimer.current) window.clearTimeout(hintTimer.current);
    hintTimer.current = window.setTimeout(markHintSeen, 2500);

    const handleScroll = () => {
      if (node.scrollLeft > 5) {
        markHintSeen();
      }
    };

    const handleResize = () => {
      if (node.scrollWidth <= node.clientWidth + 4) {
        setShowScrollHint(false);
      } else if (!node.scrollLeft) {
        setShowScrollHint(true);
      }
    };

    node.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleResize);

    return () => {
      if (hintTimer.current) window.clearTimeout(hintTimer.current);
      node.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, [isMobile, view, month, year, sortedEvents.length, showScrollHint]);

  return (
    <div className="scale-card-container">
      <div className="scale-card" aria-live="polite">
        <div ref={previewRef} className="cardPreviewScroll">
          <CardContent showControl />
          {showScrollHint && (
            <div className="scroll-hint" role="status" aria-live="polite">
              ⟷ Arraste para o lado
            </div>
          )}
        </div>
      </div>
      <button className="button primary" type="button" onClick={exportCard} disabled={isExporting}>
        {isExporting ? 'Gerando PNG...' : 'Exportar PNG'}
      </button>
      <div ref={exportRef} className="card-export-stage" aria-hidden="true">
        <CardContent showControl={false} />
      </div>
    </div>
  );
  }
);

ScaleCard.displayName = 'ScaleCard';

export default ScaleCard;

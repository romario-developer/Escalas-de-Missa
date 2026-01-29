import { useMemo, useRef, useState, useEffect, type ChangeEvent } from 'react';
import dayjs from 'dayjs';
import ScaleCard, { type ScaleCardHandle } from '../components/ScaleCard';
import MonthlyCalendar from '../components/MonthlyCalendar';
import EditEventDrawer from '../components/EditEventDrawer';
import {
  type Ministry,
  type ScheduleConfig,
  type ScheduleEvent,
  WEEKDAY_ORDER,
  type Weekday,
} from '../domain/scheduleGenerator';
import { type ExceptionEvent } from '../domain/exceptionsStore';
import { generateStableId } from '../utils/ids';

interface AppTabsProps {
  config: ScheduleConfig;
  schedule: ScheduleEvent[];
  exceptions: ExceptionEvent[];
  selectedMonth: number;
  onMonthChange: (month: number) => void;
  onConfigChange: (config: ScheduleConfig) => void;
  onSaveException: (payload: ExceptionEvent) => void;
  onRemoveException: (date: string) => void;
  onExportJson: () => void;
  onImportJson: (data: unknown) => void;
}

type TabOption = 'calendar' | 'card' | 'settings';

const WEEKDAY_LABELS: Record<Weekday, string> = {
  DOM: 'Domingo',
  SEG: 'Segunda',
  TER: 'Terça',
  QUA: 'Quarta',
  QUI: 'Quinta',
  SEX: 'Sexta',
  SAB: 'Sábado',
};

const AppTabs = ({
  config,
  schedule,
  exceptions,
  selectedMonth,
  onMonthChange,
  onConfigChange,
  onSaveException,
  onRemoveException,
  onExportJson,
  onImportJson,
}: AppTabsProps) => {
  const [activeTab, setActiveTab] = useState<TabOption>('calendar');
  const [editor, setEditor] = useState({
    isOpen: false,
    date: null as string | null,
    event: undefined as ScheduleEvent | undefined,
  });
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const scaleCardRef = useRef<ScaleCardHandle | null>(null);
  const [isCardExporting, setIsCardExporting] = useState(false);
  const [draftMinistries, setDraftMinistries] = useState<Ministry[]>(config.ministries);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const pendingAutoFocusId = useRef<string | null>(null);

  const exceptionSet = useMemo(() => new Set(exceptions.map((item) => item.date)), [exceptions]);

  const monthEvents = useMemo(
    () => schedule.filter((event) => dayjs(event.date).month() + 1 === selectedMonth),
    [schedule, selectedMonth]
  );

  const monthString = String(selectedMonth).padStart(2, '0');
  const monthName = dayjs(config.year + '-' + monthString + '-01').format('MMMM');

  useEffect(() => {
    setDraftMinistries(config.ministries);
  }, [config.ministries]);

  useEffect(() => {
    if (!pendingAutoFocusId.current) return;
    const node = inputRefs.current[pendingAutoFocusId.current];
    if (node) {
      node.focus();
      node.select();
    }
    pendingAutoFocusId.current = null;
  }, [draftMinistries]);

  const openEditor = (date: string, event?: ScheduleEvent) => {
    setEditor({ isOpen: true, date, event });
  };

  const closeEditor = () => {
    setEditor({ isOpen: false, date: null, event: undefined });
  };

  const handleMonthChange = (event: ChangeEvent<HTMLSelectElement>) => {
    onMonthChange(Number(event.target.value));
  };

  const toggleWeekday = (weekday: Weekday) => {
    const next = new Set(config.activeWeekdays);
    if (next.has(weekday)) next.delete(weekday);
    else next.add(weekday);
    const ordered = WEEKDAY_ORDER.filter((day) => next.has(day));
    onConfigChange({ ...config, activeWeekdays: ordered });
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = reader.result ? JSON.parse(reader.result.toString()) : null;
        onImportJson(parsed);
      } catch (error) {
        console.error('Falha ao importar JSON', error);
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const commitMinistries = () => {
    const hasDifferentNames =
      draftMinistries.length !== config.ministries.length ||
      draftMinistries.some((ministry, index) => ministry.name !== config.ministries[index]?.name);
    if (!hasDifferentNames) return;
    onConfigChange({ ...config, ministries: draftMinistries.map((ministry) => ({ ...ministry })) });
  };

  const handleMinistryChange = (id: string, value: string) => {
    setDraftMinistries((prev) =>
      prev.map((ministry) => (ministry.id === id ? { ...ministry, name: value } : ministry))
    );
  };

  const moveMinistry = (id: string, direction: 'up' | 'down') => {
    setDraftMinistries((prev) => {
      const index = prev.findIndex((item) => item.id === id);
      if (index === -1) return prev;
      const swapIndex = direction === 'up' ? index - 1 : index + 1;
      if (swapIndex < 0 || swapIndex >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
      onConfigChange({ ...config, ministries: next.map((item) => ({ ...item })) });
      return next;
    });
  };

  const removeMinistry = (id: string) => {
    setDraftMinistries((prev) => {
      if (prev.length <= 1) return prev;
      const next = prev.filter((item) => item.id !== id);
      onConfigChange({ ...config, ministries: next.map((item) => ({ ...item })) });
      return next.length ? next : prev;
    });
  };

  const addMinistry = () => {
    const nextMinistry: Ministry = { id: generateStableId(), name: '' };
    const next = [...draftMinistries, nextMinistry];
    setDraftMinistries(next);
    pendingAutoFocusId.current = nextMinistry.id;
    onConfigChange({ ...config, ministries: next.map((item) => ({ ...item })) });
  };

  const handleCardExport = () => {
    scaleCardRef.current?.exportCard();
  };

  return (
    <div className="app-shell">
      <div className="app-board">
        <div className="header-title">Escalas de Missa</div>
        <div className="tabs">
          <button
            className={`tab-button ${activeTab === 'calendar' ? 'active' : ''}`}
            type="button"
            onClick={() => setActiveTab('calendar')}
          >
            Calendário
          </button>
          <button
            className={`tab-button ${activeTab === 'card' ? 'active' : ''}`}
            type="button"
            onClick={() => setActiveTab('card')}
          >
            Card
          </button>
          <button
            className={`tab-button ${activeTab === 'settings' ? 'active' : ''}`}
            type="button"
            onClick={() => setActiveTab('settings')}
          >
            Configurações
          </button>
        </div>
        <div className="panel">
          {activeTab === 'calendar' && (
            <>
              <div className="month-controls">
                <div>
                  <p className="notice">Ano {config.year}</p>
                  <select value={selectedMonth} onChange={handleMonthChange}>
                    {Array.from({ length: 12 }, (_, index) => (
                      <option key={index} value={index + 1}>
                        {dayjs().month(index).format('MMMM')}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="button-group">
                  <button type="button" className="button secondary" onClick={onExportJson}>
                    Exportar JSON
                  </button>
                  <button
                    type="button"
                    className="button secondary"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Importar JSON
                  </button>
                </div>
              </div>
              <MonthlyCalendar
                year={config.year}
                month={selectedMonth}
                events={monthEvents}
                onDayClick={(date, event) => openEditor(date, event)}
              />
            </>
          )}

          {activeTab === 'card' && (
            <>
              <div className="month-controls">
                <div>
                  <p className="notice">{monthName.toUpperCase()}</p>
                  <small>Use o Calendário para mudar o mês</small>
                </div>
              </div>
              <div className="card-tab-content">
                <ScaleCard
                  ref={scaleCardRef}
                  year={config.year}
                  month={selectedMonth}
                  events={monthEvents}
                  onExportStateChange={setIsCardExporting}
                />
              </div>
              <div className="card-actions-mobile">
                <button
                  className="button primary"
                  type="button"
                  onClick={handleCardExport}
                  disabled={isCardExporting}
                >
                  {isCardExporting ? 'Gerando PNG...' : 'Exportar PNG'}
                </button>
              </div>
            </>
          )}

          {activeTab === 'settings' && (
            <div className="settings-grid">
              <div className="setting-card">
                <h4>Rotação de ministérios</h4>
                <div className="list-stack">
                  {draftMinistries.map((ministry, index) => (
                    <div key={ministry.id} className="list-item">
                      <input
                        ref={(node) => {
                          if (node) inputRefs.current[ministry.id] = node;
                        }}
                        value={ministry.name}
                        onChange={(event) => handleMinistryChange(ministry.id, event.target.value)}
                        onBlur={commitMinistries}
                      />
                      <div className="list-actions">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => moveMinistry(ministry.id, 'up')}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          disabled={index === draftMinistries.length - 1}
                          onClick={() => moveMinistry(ministry.id, 'down')}
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          disabled={draftMinistries.length <= 1}
                          onClick={() => removeMinistry(ministry.id)}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <button type="button" className="button secondary" onClick={addMinistry}>
                  Adicionar ministério
                </button>
              </div>
              <div className="setting-card">
                <h4>Ano e dias ativos</h4>
                <div className="settings-grid">
                  <label>
                    Ano
                    <input
                      type="number"
                      value={config.year}
                      onChange={(event) =>
                        onConfigChange({ ...config, year: Number(event.target.value) || config.year })
                      }
                    />
                  </label>
                  <div>
                    <p>Dias ativos</p>
                    <div className="checkbox-grid">
                      {WEEKDAY_ORDER.map((weekday) => (
                        <label key={weekday}>
                          <input
                            type="checkbox"
                            checked={config.activeWeekdays.includes(weekday)}
                            onChange={() => toggleWeekday(weekday)}
                          />
                          {WEEKDAY_LABELS[weekday]}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                <label>
                  Ministério do 5º domingo
                  <input
                    value={config.fifthSundayMinistry}
                    onChange={(event) =>
                      onConfigChange({ ...config, fifthSundayMinistry: event.target.value })
                    }
                  />
                </label>
              </div>
              <div className="setting-card">
                <h4>Backup</h4>
                <p className="notice">Guarde seus dados para restaurar ou compartilhar configurações.</p>
                <div className="button-group">
                  <button type="button" className="button secondary" onClick={onExportJson}>
                    Exportar JSON
                  </button>
                  <button
                    type="button"
                    className="button secondary"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Importar JSON
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <EditEventDrawer
        isOpen={Boolean(editor.isOpen)}
        date={editor.date}
        event={editor.event}
        hasException={editor.date ? exceptionSet.has(editor.date) : false}
        ministries={config.ministries}
        onClose={closeEditor}
        onSave={onSaveException}
        onRemove={onRemoveException}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
    </div>
  );
};

export default AppTabs;

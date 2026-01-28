import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import dayjs from 'dayjs';
import ScaleCard from '../components/ScaleCard';
import MonthlyCalendar from '../components/MonthlyCalendar';
import EditEventDrawer from '../components/EditEventDrawer';
import {
  type ScheduleConfig,
  type ScheduleEvent,
  WEEKDAY_ORDER,
  type Weekday,
} from '../domain/scheduleGenerator';
import { type ExceptionEvent } from '../domain/exceptionsStore';

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

  const exceptionSet = useMemo(() => new Set(exceptions.map((item) => item.date)), [exceptions]);

  const monthEvents = useMemo(
    () => schedule.filter((event) => dayjs(event.date).month() + 1 === selectedMonth),
    [schedule, selectedMonth]
  );

  const monthString = String(selectedMonth).padStart(2, '0');
  const monthName = dayjs(config.year + '-' + monthString + '-01').format('MMMM');

  const openEditor = (date: string, event?: ScheduleEvent) => {
    setEditor({ isOpen: true, date, event });
  };

  const closeEditor = () => {
    setEditor({ isOpen: false, date: null, event: undefined });
  };

  const handleMonthChange = (event: ChangeEvent<HTMLSelectElement>) => {
    onMonthChange(Number(event.target.value));
  };

  const updateMinistryOrder = (ministries: string[]) => {
    onConfigChange({ ...config, ministries });
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
              <ScaleCard year={config.year} month={selectedMonth} events={monthEvents} />
            </>
          )}

          {activeTab === 'settings' && (
            <div className="settings-grid">
              <div className="setting-card">
                <h4>Rotação de ministérios</h4>
                <div className="list-stack">
                  {config.ministries.map((ministry, index) => (
                    <div key={`${ministry}-${index}`} className="list-item">
                      <input
                        value={ministry}
                        onChange={(event) => {
                          const next = [...config.ministries];
                          next[index] = event.target.value;
                          updateMinistryOrder(next);
                        }}
                      />
                      <div className="list-actions">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => {
                            const next = [...config.ministries];
                            [next[index - 1], next[index]] = [next[index], next[index - 1]];
                            updateMinistryOrder(next);
                          }}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          disabled={index === config.ministries.length - 1}
                          onClick={() => {
                            const next = [...config.ministries];
                            [next[index], next[index + 1]] = [next[index + 1], next[index]];
                            updateMinistryOrder(next);
                          }}
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          disabled={config.ministries.length <= 1}
                          onClick={() => {
                            const next = config.ministries.filter((_, i) => i !== index);
                            updateMinistryOrder(next.length ? next : [config.ministries[index]]);
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => updateMinistryOrder([...config.ministries, 'Novo Ministério'])}
                >
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

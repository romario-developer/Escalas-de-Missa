import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import AppTabs from './pages/AppTabs';
import { loadExceptions, mergeScheduleWithExceptions, saveExceptions } from './domain/exceptionsStore';
import type { ExceptionEvent } from './domain/exceptionsStore';
import { generateYearSchedule } from './domain/scheduleGenerator';
import type { ScheduleConfig, ScheduleEvent } from './domain/scheduleGenerator';
import { loadFromStorage, saveToStorage } from './utils/storage';

const CONFIG_STORAGE_KEY = 'appescalas-config';
const DEFAULT_CONFIG: ScheduleConfig = {
  year: 2026,
  ministries: ['Arcanjos', 'Viver é Cristo', 'Ágape'],
  activeWeekdays: ['DOM', 'TER', 'QUI'],
  fifthSundayMinistry: 'Joias de Cristo',
};

const normalizeConfig = (value?: Partial<ScheduleConfig> | null): ScheduleConfig => {
  if (!value) return DEFAULT_CONFIG;
  return {
    ...DEFAULT_CONFIG,
    ...value,
    ministries: value.ministries?.length ? value.ministries : DEFAULT_CONFIG.ministries,
    activeWeekdays: value.activeWeekdays?.length ? value.activeWeekdays : DEFAULT_CONFIG.activeWeekdays,
    fifthSundayMinistry: value.fifthSundayMinistry ?? DEFAULT_CONFIG.fifthSundayMinistry,
    year: value.year ?? DEFAULT_CONFIG.year,
  };
};

const buildInitialConfig = (): ScheduleConfig => {
  const persisted = loadFromStorage<ScheduleConfig>(CONFIG_STORAGE_KEY);
  return normalizeConfig(persisted);
};

const getCurrentMonth = () => dayjs().month() + 1;

function App() {
  const [config, setConfig] = useState<ScheduleConfig>(() => buildInitialConfig());
  const [exceptions, setExceptions] = useState<ExceptionEvent[]>(() => loadExceptions());
  const [selectedMonth, setSelectedMonth] = useState<number>(() => getCurrentMonth());

  useEffect(() => {
    saveToStorage(CONFIG_STORAGE_KEY, config);
  }, [config]);

  useEffect(() => {
    saveExceptions(exceptions);
  }, [exceptions]);

  const baseSchedule = useMemo<ScheduleEvent[]>(() => generateYearSchedule(config), [config]);
  const schedule = useMemo<ScheduleEvent[]>(
    () => mergeScheduleWithExceptions(baseSchedule, exceptions),
    [baseSchedule, exceptions]
  );

  const handleSaveException = (payload: ExceptionEvent) => {
    setExceptions((prev) => {
      const filtered = prev.filter((item) => item.date !== payload.date);
      return [...filtered, payload];
    });
  };

  const handleRemoveException = (date: string) => {
    setExceptions((prev) => prev.filter((item) => item.date !== date));
  };

  const exportState = () => {
    const payload = { config, exceptions };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `escala-missa-${config.year}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const importState = (data: unknown) => {
    if (!data || typeof data !== 'object') return;
    const payload = data as {
      config?: Partial<ScheduleConfig>;
      exceptions?: ExceptionEvent[];
    };

    if (payload.config) {
      setConfig(normalizeConfig(payload.config));
    }
    if (Array.isArray(payload.exceptions)) {
      setExceptions(payload.exceptions);
    }
  };

  return (
    <AppTabs
      config={config}
      schedule={schedule}
      selectedMonth={selectedMonth}
      onMonthChange={setSelectedMonth}
      exceptions={exceptions}
      onConfigChange={setConfig}
      onSaveException={handleSaveException}
      onRemoveException={handleRemoveException}
      onExportJson={exportState}
      onImportJson={importState}
    />
  );
}

export default App;


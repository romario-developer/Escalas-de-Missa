import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import AppTabs from './pages/AppTabs';
import { loadExceptions, mergeScheduleWithExceptions, saveExceptions } from './domain/exceptionsStore';
import type { ExceptionEvent } from './domain/exceptionsStore';
import { generateYearSchedule } from './domain/scheduleGenerator';
import type { Ministry, ScheduleConfig, ScheduleEvent, Weekday } from './domain/scheduleGenerator';
import { loadFromStorage, saveToStorage } from './utils/storage';
import { generateStableId } from './utils/ids';

const CONFIG_STORAGE_KEY = 'appescalas-config';
const DEFAULT_YEAR = 2026;
const DEFAULT_MINISTRY_NAMES = ['Arcanjos', 'Viver é Cristo', 'Ágape'] as const;
const DEFAULT_ACTIVE_WEEKDAYS: Weekday[] = ['DOM', 'TER', 'QUI'];
const DEFAULT_FIFTH_SUNDAY_MINISTRY = 'Joias de Cristo';

const createMinistryRecord = (name = '', id?: string): Ministry => ({
  id: id ?? generateStableId(),
  name: name?.trim() ?? '',
});

const buildMinistriesFromInput = (input?: (Ministry | string)[]): Ministry[] => {
  if (!input || !input.length) {
    return DEFAULT_MINISTRY_NAMES.map((entry) => createMinistryRecord(entry));
  }
  return input.map((entry) => {
    if (typeof entry === 'string') {
      return createMinistryRecord(entry);
    }
    return createMinistryRecord(entry.name, entry.id);
  });
};

const buildDefaultConfig = (): ScheduleConfig => ({
  year: DEFAULT_YEAR,
  ministries: buildMinistriesFromInput(DEFAULT_MINISTRY_NAMES as string[]),
  activeWeekdays: [...DEFAULT_ACTIVE_WEEKDAYS],
  fifthSundayMinistry: DEFAULT_FIFTH_SUNDAY_MINISTRY,
});

const normalizeConfig = (value?: Partial<ScheduleConfig> | null): ScheduleConfig => {
  const base = buildDefaultConfig();
  if (!value) return base;
  return {
    ...base,
    ...value,
    ministries: buildMinistriesFromInput(value.ministries ?? base.ministries),
    activeWeekdays: value.activeWeekdays?.length ? value.activeWeekdays : base.activeWeekdays,
    fifthSundayMinistry: value.fifthSundayMinistry ?? base.fifthSundayMinistry,
    year: value.year ?? base.year,
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

const canAccessStorage = () => typeof window !== 'undefined' && window.localStorage;

export const loadFromStorage = <T>(key: string): T | null => {
  if (!canAccessStorage()) return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch (error) {
    console.warn('loadFromStorage failed', error);
    return null;
  }
};

export const saveToStorage = <T>(key: string, value: T): void => {
  if (!canAccessStorage()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
};


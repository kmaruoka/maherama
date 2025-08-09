import { useEffect, useState } from 'react';

export default function useLocalStorageState<T>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const getStored = (): T => {
    if (typeof window === 'undefined') return initialValue;
    const stored = localStorage.getItem(key);
    if (stored !== null) {
      try {
        return JSON.parse(stored) as T;
      } catch {
        return stored as unknown as T;
      }
    }
    return initialValue;
  };

  const [value, setValue] = useState<T>(getStored);

  useEffect(() => {
    try {
      if (value !== null && value !== undefined) {
        localStorage.setItem(key, JSON.stringify(value));
      } else {
        localStorage.removeItem(key);
      }
    } catch {
      /* ignore */
    }
  }, [key, value]);

  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === key) {
        if (e.newValue === null) {
          setValue(initialValue);
        } else {
          try {
            setValue(JSON.parse(e.newValue) as T);
          } catch {
            setValue(e.newValue as unknown as T);
          }
        }
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [key, initialValue]);

  return [value, setValue];
}

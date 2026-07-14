import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { Colors, type Palette } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { storage, StorageKeys } from '@/lib/storage';

export type Scheme = 'light' | 'dark';
export type ThemeMode = Scheme | 'system';

type ThemePreferenceValue = {
  mode: ThemeMode;
  scheme: Scheme;
  setMode: (mode: ThemeMode) => void;
  toggleScheme: () => void;
};

const ThemePreferenceContext = createContext<ThemePreferenceValue | null>(null);

function resolveScheme(mode: ThemeMode, systemScheme: string | null | undefined): Scheme {
  if (mode !== 'system') return mode;
  return systemScheme === 'dark' ? 'dark' : 'light';
}

export function ThemePreferenceProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    let mounted = true;
    storage.get(StorageKeys.themeMode).then((stored) => {
      if (!mounted) return;
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setModeState(stored);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const setMode = useCallback((nextMode: ThemeMode) => {
    setModeState(nextMode);
    void storage.set(StorageKeys.themeMode, nextMode);
  }, []);

  const scheme = resolveScheme(mode, systemScheme);

  const toggleScheme = useCallback(() => {
    setMode(scheme === 'dark' ? 'light' : 'dark');
  }, [scheme, setMode]);

  const value = useMemo<ThemePreferenceValue>(
    () => ({ mode, scheme, setMode, toggleScheme }),
    [mode, scheme, setMode, toggleScheme],
  );

  return <ThemePreferenceContext.Provider value={value}>{children}</ThemePreferenceContext.Provider>;
}

export function useThemePreference(): ThemePreferenceValue {
  const ctx = useContext(ThemePreferenceContext);
  const systemScheme = useColorScheme();
  const fallbackScheme = resolveScheme('system', systemScheme);
  return ctx ?? {
    mode: 'system',
    scheme: fallbackScheme,
    setMode: () => undefined,
    toggleScheme: () => undefined,
  };
}

export function useScheme(): Scheme {
  return useThemePreference().scheme;
}

/** Active palette for the current color scheme. */
export function useTheme(): Palette {
  return Colors[useScheme()];
}

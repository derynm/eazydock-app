import { Colors, type Palette } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export type Scheme = 'light' | 'dark';

export function useScheme(): Scheme {
  const scheme = useColorScheme();
  return scheme === 'dark' ? 'dark' : 'light';
}

/** Active palette for the current color scheme. */
export function useTheme(): Palette {
  return Colors[useScheme()];
}

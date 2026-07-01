import { Pressable, type PressableProps, StyleSheet, View, type ViewProps } from 'react-native';

import { Radius, Shadow, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type CardProps = ViewProps & {
  padded?: boolean;
  elevated?: boolean;
  /** Render as a sunken/alt surface instead of the raised card. */
  variant?: 'surface' | 'alt';
};

export function Card({ padded = true, elevated, variant = 'surface', style, ...rest }: CardProps) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: variant === 'alt' ? theme.surfaceAlt : theme.surface,
          borderColor: theme.border,
        },
        padded && styles.padded,
        elevated && (Shadow.sm as object),
        style,
      ]}
      {...rest}
    />
  );
}

type PressableCardProps = PressableProps & { padded?: boolean; elevated?: boolean };

export function PressableCard({ padded = true, elevated, style, ...rest }: PressableCardProps) {
  const theme = useTheme();
  return (
    <Pressable
      style={(state) => [
        styles.base,
        { backgroundColor: theme.surface, borderColor: theme.border },
        padded && styles.padded,
        elevated && (Shadow.sm as object),
        'pressed' in state && state.pressed && { backgroundColor: theme.surfaceSunken },
        typeof style === 'function' ? style(state) : style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  padded: { padding: Spacing.lg },
});

import { StyleSheet, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { Text } from './text';

export type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info';

type Props = {
  label: string;
  tone?: Tone;
  dot?: boolean;
  size?: 'sm' | 'md';
};

export function Badge({ label, tone = 'neutral', dot, size = 'md' }: Props) {
  const theme = useTheme();

  const map: Record<Tone, { bg: string; fg: string }> = {
    neutral: { bg: theme.neutralSoft, fg: theme.textSecondary },
    primary: { bg: theme.primarySoft, fg: theme.primary },
    success: { bg: theme.successSoft, fg: theme.success },
    warning: { bg: theme.warningSoft, fg: theme.warning },
    danger: { bg: theme.dangerSoft, fg: theme.danger },
    info: { bg: theme.infoSoft, fg: theme.info },
  };
  const c = map[tone];

  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: c.bg,
          paddingVertical: size === 'sm' ? 2 : 4,
          paddingHorizontal: size === 'sm' ? Spacing.sm : Spacing.md,
        },
      ]}>
      {dot ? <View style={[styles.dot, { backgroundColor: c.fg }]} /> : null}
      <Text variant={size === 'sm' ? 'caption' : 'label'} tint={c.fg}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs + 2,
    borderRadius: Radius.pill,
    alignSelf: 'flex-start',
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
});

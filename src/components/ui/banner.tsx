import { StyleSheet, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { Button } from './button';
import { Icon, type IconName } from './icon';
import { Text } from './text';
import type { Tone } from './badge';

type Props = {
  title: string;
  message?: string;
  tone?: Tone;
  icon?: IconName;
  actionLabel?: string;
  onAction?: () => void;
};

export function Banner({ title, message, tone = 'danger', icon, actionLabel, onAction }: Props) {
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
  const glyph: IconName = icon ?? (tone === 'danger' ? 'alert' : tone === 'warning' ? 'warning' : 'info');

  return (
    <View style={[styles.wrap, { backgroundColor: c.bg }]}>
      <Icon name={glyph} size={20} color={c.fg} />
      <View style={styles.text}>
        <Text variant="label" tint={c.fg}>
          {title}
        </Text>
        {message ? (
          <Text variant="caption" tint={c.fg} style={{ opacity: 0.85 }}>
            {message}
          </Text>
        ) : null}
      </View>
      {actionLabel && onAction ? (
        <Button title={actionLabel} variant="secondary" size="sm" onPress={onAction} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.md,
  },
  text: { flex: 1, gap: 2 },
});

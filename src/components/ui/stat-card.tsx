import { StyleSheet, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import type { Tone } from './badge';
import { Card } from './card';
import { Icon, type IconName } from './icon';
import { Text } from './text';

type Props = {
  label: string;
  value: string | number;
  icon: IconName;
  tone?: Tone;
  hint?: string;
  /** Denser presentation for small dashboard grids. */
  compact?: boolean;
  /** Optional delta/trend text shown next to the hint. */
  trend?: string;
};

const toneColor = (theme: ReturnType<typeof useTheme>, tone: Tone) =>
  ({
    neutral: { bg: theme.neutralSoft, fg: theme.textSecondary },
    primary: { bg: theme.primarySoft, fg: theme.primary },
    success: { bg: theme.successSoft, fg: theme.success },
    warning: { bg: theme.warningSoft, fg: theme.warning },
    danger: { bg: theme.dangerSoft, fg: theme.danger },
    info: { bg: theme.infoSoft, fg: theme.info },
  })[tone];

export function StatCard({ label, value, icon, tone = 'primary', hint, compact = false, trend }: Props) {
  const theme = useTheme();
  const c = toneColor(theme, tone);
  return (
    <Card style={[styles.card, compact && styles.cardCompact]}>
      <View style={styles.top}>
        <View style={[styles.iconWrap, compact && styles.iconWrapCompact, { backgroundColor: c.bg }]}>
          <Icon name={icon} size={compact ? 17 : 20} color={c.fg} />
        </View>
        {trend ? (
          <Text variant="caption" tint={c.fg} style={compact && styles.metaCompact}>
            {trend}
          </Text>
        ) : null}
      </View>
      <Text
        variant="display"
        style={[styles.value, compact && styles.valueCompact]}
        numberOfLines={1}
        adjustsFontSizeToFit>
        {value}
      </Text>
      <Text variant="label" color="textSecondary" style={compact && styles.labelCompact} numberOfLines={1}>
        {label}
      </Text>
      {hint ? (
        <Text variant="caption" color="textMuted" style={compact && styles.metaCompact} numberOfLines={1}>
          {hint}
        </Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: Spacing.xs, minHeight: 132, justifyContent: 'space-between' },
  cardCompact: { gap: 2, minHeight: 106, padding: Spacing.md },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconWrap: { width: 40, height: 40, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  iconWrapCompact: { width: 32, height: 32, borderRadius: Radius.sm },
  value: { marginTop: Spacing.sm },
  valueCompact: { fontSize: 28, lineHeight: 32, marginTop: Spacing.xs },
  labelCompact: { fontSize: 12, lineHeight: 16 },
  metaCompact: { fontSize: 11, lineHeight: 14 },
});

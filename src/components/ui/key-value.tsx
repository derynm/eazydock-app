import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';

import { Icon, type IconName } from './icon';
import { Text } from './text';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  label: string;
  value?: string | null;
  icon?: IconName;
  /** Lay label above value (stacked) instead of side-by-side. */
  stacked?: boolean;
};

export function KeyValue({ label, value, icon, stacked }: Props) {
  const theme = useTheme();
  const display = value && value.trim().length > 0 ? value : '—';
  const muted = display === '—';

  if (stacked) {
    return (
      <View style={styles.stacked}>
        <Text variant="caption" color="textMuted">
          {label}
        </Text>
        <View style={styles.valueRow}>
          {icon ? <Icon name={icon} size={15} color={theme.textSecondary} /> : null}
          <Text variant="body" color={muted ? 'textMuted' : 'text'}>
            {display}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.row}>
      <Text variant="body" color="textSecondary" style={styles.rowLabel}>
        {label}
      </Text>
      <View style={[styles.valueRow, styles.rowValue]}>
        {icon ? <Icon name={icon} size={15} color={theme.textSecondary} /> : null}
        <Text variant="bodyStrong" color={muted ? 'textMuted' : 'text'} style={styles.flexEnd}>
          {display}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stacked: { gap: Spacing.xs, flex: 1, minWidth: 130 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, gap: Spacing.md },
  rowLabel: { flex: 1 },
  rowValue: { flexShrink: 1 },
  valueRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs + 2 },
  flexEnd: { textAlign: 'right' },
});

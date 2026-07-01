import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { Icon } from './icon';
import { Text } from './text';

type Props = {
  title: string;
  subtitle?: string;
  meta?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  onPress?: () => void;
  selected?: boolean;
  showChevron?: boolean;
};

export function ListRow({
  title,
  subtitle,
  meta,
  leading,
  trailing,
  onPress,
  selected,
  showChevron = true,
}: Props) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={(state) => [
        styles.row,
        selected && { backgroundColor: theme.primarySoft, borderRadius: Radius.md },
        'pressed' in state && state.pressed && !selected && { backgroundColor: theme.surfaceSunken, borderRadius: Radius.md },
      ]}>
      {leading ? <View>{leading}</View> : null}
      <View style={styles.body}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" color="textSecondary" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
        {meta ? (
          <Text variant="caption" color="textMuted" numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
      </View>
      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
      {showChevron && onPress ? (
        <Icon name="chevronRight" size={18} color={theme.textMuted} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  body: { flex: 1, gap: 2 },
  trailing: { alignItems: 'flex-end', gap: Spacing.xs },
});

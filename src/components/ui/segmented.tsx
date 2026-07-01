import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { Text } from './text';

export type SegmentOption<T extends string> = { value: T; label: string; count?: number };

type Props<T extends string> = {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Scrollable pill row (good for many filters) vs. equal-width track. */
  scrollable?: boolean;
};

export function Segmented<T extends string>({ options, value, onChange, scrollable }: Props<T>) {
  const theme = useTheme();

  const items = options.map((opt) => {
    const active = opt.value === value;
    return (
      <Pressable
        key={opt.value}
        onPress={() => onChange(opt.value)}
        style={[
          styles.item,
          scrollable && styles.itemPill,
          scrollable && { borderColor: active ? 'transparent' : theme.border },
          { backgroundColor: active ? (scrollable ? theme.primary : theme.surface) : 'transparent' },
          !scrollable && active && (styles.elevated as object),
        ]}>
        <Text
          variant="label"
          tint={active ? (scrollable ? theme.onPrimary : theme.text) : theme.textSecondary}>
          {opt.label}
          {opt.count != null ? `  ${opt.count}` : ''}
        </Text>
      </Pressable>
    );
  });

  if (scrollable) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollRow}>
        {items}
      </ScrollView>
    );
  }

  return <View style={[styles.track, { backgroundColor: theme.surfaceSunken }]}>{items}</View>;
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', padding: 3, borderRadius: Radius.md, gap: 3 },
  scrollRow: { flexDirection: 'row', gap: Spacing.sm, paddingRight: Spacing.lg },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
  },
  itemPill: {
    flex: 0,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  elevated: {
    shadowColor: '#0B1F33',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
});

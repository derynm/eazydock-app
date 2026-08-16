import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

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
  /** Use the brand color for the selected equal-width segment. */
  activeTone?: 'surface' | 'primary';
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const TRACK_PADDING = 3;
const TRACK_GAP = 3;

export function Segmented<T extends string>({ options, value, onChange, scrollable, activeTone = 'surface' }: Props<T>) {
  const theme = useTheme();
  // Width of each segment, measured from its content so labels never collide.
  const [trackWidth, setTrackWidth] = useState(0);
  const [itemWidths, setItemWidths] = useState<number[]>([]);
  const activeIndex = Math.max(0, options.findIndex((opt) => opt.value === value));
  const indicatorX = useSharedValue(0);
  const indicatorW = useSharedValue(0);

  useEffect(() => {
    if (itemWidths.length !== options.length || itemWidths.some((width) => width <= 0)) return;
    const contentWidth = itemWidths.reduce((sum, width) => sum + width, 0) + TRACK_GAP * (options.length - 1);
    // Segments are centered in the track, so the indicator needs the same lead-in.
    const leading = Math.max(0, (trackWidth - TRACK_PADDING * 2 - contentWidth) / 2);
    const offsetX = leading + itemWidths.slice(0, activeIndex).reduce((sum, width) => sum + width + TRACK_GAP, TRACK_PADDING);
    indicatorX.value = withTiming(offsetX, { duration: 180 });
    indicatorW.value = withTiming(itemWidths[activeIndex], { duration: 180 });
  }, [activeIndex, itemWidths, trackWidth, options.length, indicatorX, indicatorW]);

  const indicatorStyle = useAnimatedStyle(() => ({
    opacity: indicatorW.value > 0 ? 1 : 0,
    width: indicatorW.value,
    transform: [{ translateX: indicatorX.value }],
  }));

  const items = options.map((opt, index) => {
    const active = opt.value === value;
    if (scrollable) {
      return (
        <ScrollableSegmentItem
          key={opt.value}
          option={opt}
          active={active}
          onPress={() => onChange(opt.value)}
        />
      );
    }

    return (
      <Pressable
        key={opt.value}
        onPress={() => onChange(opt.value)}
        onLayout={(event) => {
          const { width } = event.nativeEvent.layout;
          setItemWidths((prev) => {
            if (Math.abs((prev[index] ?? 0) - width) < 0.5) return prev;
            const next = [...prev];
            next[index] = width;
            return next;
          });
        }}
        style={styles.item}>
        <View style={styles.itemContent}>
          <Text
            variant="label"
            numberOfLines={1}
            tint={active ? (activeTone === 'primary' ? theme.onPrimary : theme.text) : theme.textSecondary}
            style={styles.itemLabel}>
            {opt.label}
          </Text>
          {opt.count != null ? (
            <View
              style={[
                styles.countBadge,
                !active && styles.countBadgeInactive,
                { backgroundColor: active ? theme.surface : 'transparent' },
              ]}>
              <Text
                variant="caption"
                tint={active && activeTone === 'primary' ? theme.primary : theme.textSecondary}
                style={styles.countText}>
                {opt.count}
              </Text>
            </View>
          ) : null}
        </View>
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

  return (
    <View
      onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
      style={[styles.track, { backgroundColor: theme.surfaceSunken }]}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.indicator,
          styles.elevated,
          { backgroundColor: activeTone === 'primary' ? theme.primary : theme.surface },
          indicatorStyle,
        ]}
      />
      {items}
    </View>
  );
}

function ScrollableSegmentItem<T extends string>({
  option,
  active,
  onPress,
}: {
  option: SegmentOption<T>;
  active: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const selected = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    selected.value = withTiming(active ? 1 : 0, { duration: 180 });
  }, [active, selected]);

  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(selected.value, [0, 1], ['rgba(0,0,0,0)', theme.primary]),
    borderColor: interpolateColor(selected.value, [0, 1], [theme.border, 'rgba(0,0,0,0)']),
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      style={[styles.item, styles.itemPill, animatedStyle]}>
      <View style={styles.itemContent}>
        <Text variant="label" tint={active ? theme.onPrimary : theme.textSecondary}>
          {option.label}
        </Text>
        {option.count != null ? (
          <View
            style={[
              styles.countBadge,
              !active && styles.countBadgeInactive,
              { backgroundColor: active ? theme.surface : 'transparent' },
            ]}>
            <Text
              variant="caption"
              tint={active ? theme.primary : theme.textSecondary}
              style={styles.countText}>
              {option.count}
            </Text>
          </View>
        ) : null}
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    padding: TRACK_PADDING,
    borderRadius: Radius.md,
    gap: TRACK_GAP,
    justifyContent: 'center',
  },
  indicator: {
    position: 'absolute',
    top: TRACK_PADDING,
    bottom: TRACK_PADDING,
    left: 0,
    borderRadius: Radius.sm,
  },
  scrollRow: { flexDirection: 'row', gap: Spacing.sm, paddingRight: Spacing.lg },
  item: {
    flexShrink: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.sm,
    zIndex: 1,
    overflow: 'hidden',
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    maxWidth: '100%',
  },
  itemLabel: { flexShrink: 1 },
  countBadge: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 4,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeInactive: { minWidth: 0, height: 'auto', paddingHorizontal: 0 },
  countText: { fontSize: 10, lineHeight: 12 },
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

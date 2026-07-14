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
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const TRACK_PADDING = 3;
const TRACK_GAP = 3;

export function Segmented<T extends string>({ options, value, onChange, scrollable }: Props<T>) {
  const theme = useTheme();
  const [trackWidth, setTrackWidth] = useState(0);
  const activeIndex = Math.max(0, options.findIndex((opt) => opt.value === value));
  const progress = useSharedValue(activeIndex);

  useEffect(() => {
    progress.value = withTiming(activeIndex, { duration: 180 });
  }, [activeIndex, progress]);

  const indicatorWidth = options.length > 0
    ? Math.max(0, (trackWidth - TRACK_PADDING * 2 - TRACK_GAP * (options.length - 1)) / options.length)
    : 0;

  const indicatorStyle = useAnimatedStyle(() => ({
    opacity: indicatorWidth > 0 ? 1 : 0,
    width: indicatorWidth,
    transform: [{ translateX: TRACK_PADDING + progress.value * (indicatorWidth + TRACK_GAP) }],
  }));

  const items = options.map((opt) => {
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
        style={styles.item}>
        <Text
          variant="label"
          tint={active ? theme.text : theme.textSecondary}>
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

  return (
    <View
      onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
      style={[styles.track, { backgroundColor: theme.surfaceSunken }]}>
      <Animated.View
        pointerEvents="none"
        style={[styles.indicator, styles.elevated, { backgroundColor: theme.surface }, indicatorStyle]}
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
      <Text
        variant="label"
        tint={active ? theme.onPrimary : theme.textSecondary}>
        {option.label}
        {option.count != null ? `  ${option.count}` : ''}
      </Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', padding: TRACK_PADDING, borderRadius: Radius.md, gap: TRACK_GAP },
  indicator: {
    position: 'absolute',
    top: TRACK_PADDING,
    bottom: TRACK_PADDING,
    left: 0,
    borderRadius: Radius.sm,
  },
  scrollRow: { flexDirection: 'row', gap: Spacing.sm, paddingRight: Spacing.lg },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    zIndex: 1,
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

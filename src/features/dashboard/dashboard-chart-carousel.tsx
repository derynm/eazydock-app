import { useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import type { DashboardMetrics } from '@/api/types';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { Text } from '@/components/ui';

type Props = {
  metrics: DashboardMetrics;
  compact?: boolean;
};

const slideKeys = ['occupancy', 'movement', 'allocation'] as const;

export function DashboardChartCarousel({ metrics, compact = false }: Props) {
  const theme = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const [width, setWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);

  const occupancyColor =
    metrics.occupancy_percentage > 85
      ? theme.danger
      : metrics.occupancy_percentage > 60
        ? theme.warning
        : theme.success;

  const onLayout = (event: LayoutChangeEvent) => {
    const nextWidth = event.nativeEvent.layout.width;
    if (nextWidth !== width) setWidth(nextWidth);
  };

  const onMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!width) return;
    setActiveIndex(Math.round(event.nativeEvent.contentOffset.x / width));
  };

  const goToSlide = (index: number) => {
    setActiveIndex(index);
    scrollRef.current?.scrollTo({ x: index * width, animated: true });
  };

  return (
    <View style={styles.root} onLayout={onLayout}>
      <View style={styles.header}>
        <Text variant="overline" color="textMuted">
          {activeIndex === 0 ? 'Occupancy' : activeIndex === 1 ? 'Today’s movement' : 'Flexible allocation'}
        </Text>
        <Text variant="caption" color="textMuted">
          {activeIndex + 1}/{slideKeys.length}
        </Text>
      </View>

      <View style={[styles.viewport, compact && styles.viewportCompact]}>
        {width > 0 ? (
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            nestedScrollEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onMomentumScrollEnd}
            scrollEventThrottle={16}>
            <View style={[styles.slide, { width }]}>
              <View style={styles.metricTop}>
                <Text variant="display" tint={occupancyColor} style={compact && styles.valueCompact}>
                  {metrics.occupancy_percentage}%
                </Text>
                <Text variant="caption" color="textMuted">
                  {metrics.occupied_spaces} of {metrics.total_spaces} bays occupied
                </Text>
              </View>
              <ChartTrack
                value={metrics.occupied_spaces}
                total={metrics.total_spaces}
                color={occupancyColor}
              />
              <View style={styles.legend}>
                <Legend color={occupancyColor} label={`Occupied ${metrics.occupied_spaces}`} />
                <Legend color={theme.surfaceSunken} label={`Available ${metrics.available_spaces}`} />
              </View>
            </View>

            <View style={[styles.slide, { width }]}>
              <ComparisonBar
                label="Check-ins"
                value={metrics.today_transactions}
                max={Math.max(metrics.today_transactions, metrics.today_checkouts, 1)}
                color={theme.primary}
              />
              <ComparisonBar
                label="Check-outs"
                value={metrics.today_checkouts}
                max={Math.max(metrics.today_transactions, metrics.today_checkouts, 1)}
                color={theme.info}
              />
              <Text variant="caption" color="textMuted">
                {metrics.today_transactions + metrics.today_checkouts} movements recorded today
              </Text>
            </View>

            <View style={[styles.slide, { width }]}>
              <View style={styles.metricTop}>
                <Text variant="display" tint={theme.primary} style={compact && styles.valueCompact}>
                  {metrics.flexible_allocation_usage_percentage}%
                </Text>
                <Text variant="caption" color="textMuted">
                  {metrics.flexible_allocation_used} of {metrics.flexible_allocation_quota} flexible bays used
                </Text>
              </View>
              <ChartTrack
                value={metrics.flexible_allocation_used}
                total={metrics.flexible_allocation_quota}
                color={theme.primary}
              />
              <View style={styles.legend}>
                <Legend color={theme.primary} label={`Used ${metrics.flexible_allocation_used}`} />
                <Legend
                  color={theme.surfaceSunken}
                  label={`Remaining ${Math.max(0, metrics.flexible_allocation_quota - metrics.flexible_allocation_used)}`}
                />
              </View>
            </View>
          </ScrollView>
        ) : null}
      </View>

      <View style={styles.dots}>
        {slideKeys.map((key, index) => (
          <Pressable
            key={key}
            accessibilityRole="button"
            accessibilityLabel={`Show ${key} chart`}
            accessibilityState={{ selected: activeIndex === index }}
            hitSlop={8}
            onPress={() => goToSlide(index)}
            style={[
              styles.dot,
              { backgroundColor: activeIndex === index ? theme.primary : theme.borderStrong },
              activeIndex === index && styles.dotActive,
            ]}
          />
        ))}
      </View>
    </View>
  );
}

function ChartTrack({ value, total, color }: { value: number; total: number; color: string }) {
  const theme = useTheme();
  const percentage = total > 0 ? Math.min(100, Math.max(0, (value / total) * 100)) : 0;

  return (
    <View style={[styles.track, { backgroundColor: theme.surfaceSunken }]}>
      <View style={[styles.fill, { width: `${percentage}%`, backgroundColor: color }]} />
    </View>
  );
}

function ComparisonBar({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  const theme = useTheme();
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <View style={styles.comparison}>
      <View style={styles.comparisonLabel}>
        <Text variant="label" color="textSecondary">
          {label}
        </Text>
        <Text variant="label">{value}</Text>
      </View>
      <View style={[styles.comparisonTrack, { backgroundColor: theme.surfaceSunken }]}>
        <View style={[styles.comparisonFill, { width: `${percentage}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text variant="caption" color="textSecondary">
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: Spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  viewport: { height: 142, overflow: 'hidden' },
  viewportCompact: { height: 126 },
  slide: { height: '100%', justifyContent: 'space-between', paddingRight: 1 },
  metricTop: { gap: 2 },
  valueCompact: { fontSize: 28, lineHeight: 32 },
  track: { height: 12, borderRadius: Radius.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: Radius.pill },
  legend: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: Spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: Radius.pill },
  comparison: { gap: 6 },
  comparisonLabel: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  comparisonTrack: { height: 10, borderRadius: Radius.pill, overflow: 'hidden' },
  comparisonFill: { height: '100%', borderRadius: Radius.pill },
  dots: { minHeight: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: Radius.pill },
  dotActive: { width: 18 },
});

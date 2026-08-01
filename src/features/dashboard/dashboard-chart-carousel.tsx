import { useRef, useState } from 'react';
import { Image } from 'expo-image';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import type { DashboardMetrics, DashboardOccupancy } from '@/api/types';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { Text } from '@/components/ui';

type Props = {
  metrics: DashboardMetrics;
  occupancy: DashboardOccupancy;
  ringSize: number;
};

const slideKeys = ['occupancy', 'movement'] as const;

export function DashboardChartCarousel({ metrics, occupancy, ringSize }: Props) {
  const theme = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const [width, setWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);

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
          {activeIndex === 0 ? 'Occupancy' : 'Today’s movement'}
        </Text>
      </View>

      <View style={[styles.viewport, { height: ringSize }]}>
        {width > 0 ? (
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            nestedScrollEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onMomentumScrollEnd}
            scrollEventThrottle={16}>
            <View style={[styles.slide, styles.occupancySlide, { width }]}>
              <OccupancyContent occupancy={occupancy} ringSize={ringSize} />
            </View>

            <View style={[styles.slide, { width }]}>
              <ComparisonBar
                label="Check-ins"
                value={metrics.today_transactions}
                max={Math.max(metrics.today_transactions, metrics.today_checkouts, 1)}
                color={theme.success}
              />
              <ComparisonBar
                label="Check-outs"
                value={metrics.today_checkouts}
                max={Math.max(metrics.today_transactions, metrics.today_checkouts, 1)}
                color={theme.primary}
              />
              <Text variant="caption" color="textMuted">
                {metrics.today_transactions + metrics.today_checkouts} movements recorded today
              </Text>
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

function occupancyRingDataUri({
  size,
  strokeWidth,
  percentage,
  trackColor,
  progressColor,
}: {
  size: number;
  strokeWidth: number;
  percentage: number;
  trackColor: string;
  progressColor: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;
  const progressLength = (percentage / 100) * circumference;
  const progressCircle =
    percentage <= 0
      ? ''
      : `<circle cx="${center}" cy="${center}" r="${radius}" fill="none" stroke="${progressColor}" stroke-width="${strokeWidth}" stroke-linecap="round"${
          percentage < 100
            ? ` stroke-dasharray="${progressLength} ${circumference - progressLength}"`
            : ''
        } transform="rotate(-90 ${center} ${center})"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${center}" cy="${center}" r="${radius}" fill="none" stroke="${trackColor}" stroke-width="${strokeWidth}"/>${progressCircle}</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function OccupancyContent({
  occupancy,
  ringSize,
}: {
  occupancy: DashboardOccupancy;
  ringSize: number;
}) {
  const theme = useTheme();
  const percentage = Math.min(100, Math.max(0, occupancy.percentage));

  return (
    <View style={styles.occupancyBody}>
      <OccupancyRing size={ringSize} percentage={percentage} />
      <View style={styles.occupancyDetails}>
        <View style={styles.occupancyHeadline}>
          <Text variant="heading" style={styles.occupancyCount}>
            {occupancy.occupied_bays} of {occupancy.total_bays}
          </Text>
          <Text variant="body" color="textSecondary">
            bays occupied
          </Text>
        </View>
        <View style={[styles.progressTrack, { backgroundColor: theme.surfaceSunken }]}>
          <View
            style={[
              styles.progressFill,
              { backgroundColor: theme.success, width: `${percentage}%` },
            ]}
          />
        </View>
        <View style={styles.occupancyLegend}>
          <OccupancyLegend
            color={theme.success}
            label="Occupied"
            value={`${occupancy.occupied_bays} bays`}
          />
          <OccupancyLegend
            color={theme.borderStrong}
            label="Available"
            value={`${occupancy.available_bays} bays`}
          />
        </View>
      </View>
    </View>
  );
}

function OccupancyRing({ size, percentage }: { size: number; percentage: number }) {
  const theme = useTheme();
  const strokeWidth = size < 140 ? 12 : 15;
  const ringUri = occupancyRingDataUri({
    size,
    strokeWidth,
    percentage,
    trackColor: theme.surfaceSunken,
    progressColor: theme.success,
  });

  return (
    <View
      accessibilityRole="summary"
      accessibilityLabel={`${percentage}% occupied`}
      style={[styles.ring, { width: size, height: size }]}>
      <Image
        pointerEvents="none"
        source={{ uri: ringUri }}
        contentFit="contain"
        cachePolicy="none"
        style={[styles.ringGraphic, { width: size, height: size }]}
      />
      <View style={styles.ringLabel}>
        <Text
          variant="display"
          style={[styles.ringPercentage, size < 140 && styles.ringPercentageCompact]}
          numberOfLines={1}>
          {percentage}%
        </Text>
        <Text variant="caption" color="textSecondary">
          Occupied
        </Text>
      </View>
    </View>
  );
}

function OccupancyLegend({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <View style={styles.occupancyLegendItem}>
      <View style={styles.occupancyLegendLabel}>
        <View style={[styles.occupancyLegendDot, { backgroundColor: color }]} />
        <Text variant="caption" color="textSecondary">
          {label}
        </Text>
      </View>
      <Text variant="caption" color="textMuted" style={styles.occupancyLegendValue}>
        {value}
      </Text>
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

const styles = StyleSheet.create({
  root: { gap: Spacing.md },
  header: { flexDirection: 'row', alignItems: 'center' },
  viewport: { overflow: 'hidden' },
  slide: { height: '100%', justifyContent: 'space-between', paddingRight: 1 },
  occupancySlide: { justifyContent: 'center' },
  comparison: { gap: 6 },
  comparisonLabel: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  comparisonTrack: { height: 10, borderRadius: Radius.pill, overflow: 'hidden' },
  comparisonFill: { height: '100%', borderRadius: Radius.pill },
  dots: { minHeight: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: Radius.pill },
  dotActive: { width: 18 },
  occupancyBody: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg },
  occupancyDetails: { flex: 1, minWidth: 0, gap: Spacing.md },
  occupancyHeadline: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'nowrap', gap: 5 },
  occupancyCount: { fontSize: 21, lineHeight: 26 },
  progressTrack: { height: 10, borderRadius: Radius.pill, overflow: 'hidden' },
  progressFill: { height: '100%', minWidth: 5, borderRadius: Radius.pill },
  occupancyLegend: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: Spacing.sm },
  occupancyLegendItem: { flex: 1, minWidth: 0, gap: 3 },
  occupancyLegendLabel: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  occupancyLegendDot: { width: 9, height: 9, borderRadius: Radius.pill },
  occupancyLegendValue: { paddingLeft: Spacing.lg },
  ring: { position: 'relative', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  ringGraphic: { position: 'absolute', left: 0, top: 0 },
  ringLabel: { alignItems: 'center', gap: 1 },
  ringPercentage: { fontSize: 30, lineHeight: 34 },
  ringPercentageCompact: { fontSize: 26, lineHeight: 30 },
});

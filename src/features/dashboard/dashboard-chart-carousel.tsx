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

import type {
  DashboardDailyParkingHours,
  DashboardMetrics,
  DashboardOccupancy,
} from '@/api/types';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { Text } from '@/components/ui';

type Props = {
  metrics: DashboardMetrics;
  occupancy: DashboardOccupancy;
  dailyParkingHours: DashboardDailyParkingHours[];
  ringSize: number;
};

const slides = [
  { key: 'daily-occupancy', title: 'Weekly occupancy' },
  { key: 'movement', title: 'Today’s movement' },
  { key: 'occupancy', title: 'Occupancy' },
] as const;

export function DashboardChartCarousel({ metrics, occupancy, dailyParkingHours, ringSize }: Props) {
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
          {slides[activeIndex]?.title ?? slides[0].title}
        </Text>
        {activeIndex === 0 ? <WeekEndingLabel daily={dailyParkingHours} /> : null}
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
            <View style={[styles.slide, { width }]}>
              <DailyOccupancyChart daily={dailyParkingHours} />
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

            <View style={[styles.slide, styles.occupancySlide, { width }]}>
              <OccupancyContent occupancy={occupancy} ringSize={ringSize} />
            </View>

          </ScrollView>
        ) : null}
      </View>

      <View style={styles.dots}>
        {slides.map((slide, index) => (
          <Pressable
            key={slide.key}
            accessibilityRole="button"
            accessibilityLabel={`Show ${slide.title} chart`}
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

function WeekEndingLabel({ daily }: { daily: DashboardDailyParkingHours[] }) {
  const date = daily.reduce<string | null>(
    (latest, day) => !latest || day.date > latest ? day.date : latest,
    null,
  );

  return (
    <Text variant="caption" color="textMuted" style={styles.weekEndingLabel}>
      Week ending{date ? ` ${formatDateDmy(date)}` : ''}
    </Text>
  );
}

function DailyOccupancyChart({ daily }: { daily: DashboardDailyParkingHours[] }) {
  const theme = useTheme();
  const [pressedDate, setPressedDate] = useState<string | null>(null);
  const operatingDays = daily.filter((day) => day.is_operating_day);

  if (operatingDays.length === 0) {
    return (
      <View style={styles.weeklyEmpty}>
        <Text variant="body" color="textMuted">
          No occupancy history available
        </Text>
      </View>
    );
  }

  return (
    <View
      accessibilityRole="summary"
      accessibilityLabel={`Daily occupancy: ${operatingDays
        .map((day) => `${formatDayLabel(day.date)}, ${day.occupancy_percentage}%`)
        .join('; ')}`}
      style={styles.weeklyChart}>
      <View style={styles.weeklyPlot}>
        {operatingDays.map((day) => {
          const percentage = Math.min(100, Math.max(0, day.occupancy_percentage));

          return (
            <Pressable
              key={day.date}
              accessibilityRole="button"
              accessibilityLabel={`${formatDayLabel(day.date)}, ${percentage}% occupancy`}
              accessibilityHint="Hold to show the occupancy percentage"
              onPressIn={() => setPressedDate(day.date)}
              onPressOut={() => setPressedDate(null)}
              style={styles.movementDay}>
              <OccupancyBar
                percentage={percentage}
                visible={pressedDate === day.date}
                color={theme.chartBar}
                trackColor={theme.surfaceSunken}
              />
            </Pressable>
          );
        })}
      </View>
      <View style={styles.weeklyLabels}>
        {operatingDays.map((day) => (
          <Text
            key={day.date}
            variant="caption"
            color="textMuted"
            style={styles.weeklyLabel}
            numberOfLines={1}>
            {formatDayLabel(day.date)}
          </Text>
        ))}
      </View>
    </View>
  );
}

function OccupancyBar({
  percentage,
  visible,
  color,
  trackColor,
}: {
  percentage: number;
  visible: boolean;
  color: string;
  trackColor: string;
}) {
  return (
    <View style={styles.movementBarColumn}>
      <Text
        variant="label"
        style={[styles.weeklyValue, !visible && styles.weeklyValueHidden]}>
        {percentage}%
      </Text>
      <View style={[styles.occupancyBarTrack, { backgroundColor: trackColor }]}>
        {percentage > 0 ? (
          <View
            style={[
              styles.occupancyBarFill,
              { backgroundColor: color, height: `${percentage}%` },
            ]}
          />
        ) : null}
      </View>
    </View>
  );
}

function formatDayLabel(date: string) {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat('en', { weekday: 'short' }).format(parsed);
}

function formatDateDmy(date: string) {
  const [year, month, day] = date.split('-');
  return year && month && day ? `${day}-${month}-${year}` : date;
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  weekEndingLabel: { fontSize: 10, lineHeight: 13 },
  viewport: { overflow: 'hidden' },
  slide: { height: '100%', justifyContent: 'space-between', paddingRight: 1 },
  occupancySlide: { justifyContent: 'center' },
  weeklyChart: { flex: 1, gap: 6 },
  weeklyPlot: { flex: 1, flexDirection: 'row', alignItems: 'stretch', gap: Spacing.sm, paddingHorizontal: Spacing.xs },
  movementDay: { flex: 1, minWidth: 0, height: '100%', flexDirection: 'row', alignItems: 'stretch', justifyContent: 'center', gap: 4 },
  movementBarColumn: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  occupancyBarTrack: { flex: 1, width: 17, justifyContent: 'flex-end', overflow: 'hidden', borderRadius: Radius.pill },
  occupancyBarFill: { width: '100%', borderRadius: Radius.pill },
  weeklyValue: { minWidth: 64, textAlign: 'center', fontSize: 11, lineHeight: 14 },
  weeklyValueHidden: { opacity: 0 },
  weeklyLabels: { flexDirection: 'row' },
  weeklyLabel: { flex: 1, minWidth: 0, textAlign: 'center', fontSize: 10, lineHeight: 13 },
  weeklyEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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

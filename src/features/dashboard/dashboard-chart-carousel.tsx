import { Image } from 'expo-image';
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

import type {
  DashboardDailyParkingHours,
  DashboardMetrics,
} from '@/api/types';
import { ChartPalette, Radius, Spacing } from '@/constants/theme';
import { useScheme, useTheme } from '@/hooks/use-theme';

import { Icon, Text, type IconName } from '@/components/ui';

type Props = {
  metrics: DashboardMetrics;
  dailyParkingHours: DashboardDailyParkingHours[];
  ringSize: number;
};

const slides = [
  { key: 'daily-occupancy', title: 'Weekly occupancy' },
  { key: 'movement', title: 'Today’s movement' },
  { key: 'occupancy', title: 'Parking space status' },
] as const;

export function DashboardChartCarousel({ metrics, dailyParkingHours, ringSize }: Props) {
  const theme = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const [width, setWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  // The weekly chart (value row + 5 gridlines + day labels) needs more room
  // than the occupancy ring, so the viewport has its own minimum height.
  const viewportHeight = Math.max(ringSize, 196);

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

      <View style={[styles.viewport, { height: viewportHeight }]}>
        {width > 0 ? (
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            nestedScrollEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onMomentumScrollEnd}
            scrollEventThrottle={16}>
            <View style={[styles.slide, { width, height: viewportHeight }]}>
              <DailyOccupancyChart daily={dailyParkingHours} />
            </View>

            <View
              style={[styles.slide, { width, height: viewportHeight }]}>
              <MovementOverview
                checkIns={metrics.today_transactions}
                checkOuts={metrics.today_checkouts}
                ringSize={ringSize < 140 ? 120 : 144}
              />
            </View>

            <View style={[styles.slide, { width, height: viewportHeight }]}>
              <ParkingSpaceStatus metrics={metrics} />
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

const Y_AXIS_STEPS = [100, 75, 50, 25, 0] as const;
const Y_AXIS_WIDTH = 26;

function DailyOccupancyChart({ daily }: { daily: DashboardDailyParkingHours[] }) {
  const theme = useTheme();
  const palette = ChartPalette[useScheme()];
  const [pressedDate, setPressedDate] = useState<string | null>(null);
  const operatingDays = daily.filter((day) => day.is_operating_day);
  const today = formatLocalIsoDate(new Date());

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
      <View style={styles.weeklyBody}>
        <View style={[styles.weeklyYAxis, { width: Y_AXIS_WIDTH }]}>
          {Y_AXIS_STEPS.map((step) => (
            <Text
              key={step}
              style={[styles.weeklyYAxisLabel, { color: theme.textMuted, top: `${100 - step}%` }]}>
              {step}
            </Text>
          ))}
        </View>
        <View style={styles.weeklyPlotArea}>
          {Y_AXIS_STEPS.map((step) => (
            <View
              key={step}
              style={[
                styles.weeklyGridline,
                {
                  backgroundColor: step === 0 ? theme.borderStrong : theme.border,
                  top: `${100 - step}%`,
                },
              ]}
            />
          ))}
          <View style={[styles.weeklyAxisLine, { backgroundColor: theme.border }]} />
          <View style={styles.weeklyPlot}>
            {operatingDays.map((day, index) => {
              const percentage = Math.min(100, Math.max(0, day.occupancy_percentage));

              return (
                <Pressable
                  key={day.date}
                  accessibilityRole="button"
                  accessibilityLabel={`${formatDayLabel(day.date)}, ${percentage}% occupancy`}
                  accessibilityHint="Hold to show the occupancy percentage"
                  onPressIn={() => setPressedDate(day.date)}
                  onPressOut={() => setPressedDate(null)}
                  style={styles.weeklyBarColumn}>
                  <Text
                    variant="label"
                    style={[
                      styles.weeklyBarValue,
                      { bottom: `${percentage}%` },
                      pressedDate !== day.date && styles.weeklyValueHidden,
                    ]}
                    numberOfLines={1}>
                    {Math.round(percentage)}%
                  </Text>
                  {percentage > 0 ? (
                    <View
                      style={[
                        styles.occupancyBarFill,
                        {
                          backgroundColor: palette[index % palette.length],
                          height: `${percentage}%`,
                        },
                      ]}
                    />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
      <View style={[styles.weeklyLabels, { paddingLeft: Y_AXIS_WIDTH + Spacing.xs, paddingRight: Spacing.xs }]}>
        {operatingDays.map((day) => {
          const isToday = day.date === today;

          return (
            <Text
              key={day.date}
              variant="caption"
              color="textMuted"
              style={[styles.weeklyLabel, isToday && { color: theme.primary, fontWeight: '600' }]}
              numberOfLines={1}>
              {isToday ? 'Today' : formatDayLabel(day.date)}
            </Text>
          );
        })}
      </View>
    </View>
  );
}

function formatDayLabel(date: string) {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat('en', { weekday: 'short' }).format(parsed);
}

function formatLocalIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateDmy(date: string) {
  const [year, month, day] = date.split('-');
  return year && month && day ? `${day}-${month}-${year}` : date;
}

function ParkingSpaceStatus({ metrics }: { metrics: DashboardMetrics }) {
  const theme = useTheme();
  const total = Math.max(0, metrics.total_spaces);
  const inactive = Math.max(0, total - Math.max(0, metrics.active_spaces));
  const statuses = [
    { label: 'Occupied', value: metrics.occupied_spaces, color: theme.success },
    { label: 'Available', value: metrics.available_spaces, color: theme.primary },
    { label: 'Maintenance', value: metrics.maintenance_spaces, color: theme.warning },
    { label: 'Blocked', value: metrics.blocked_spaces, color: theme.danger },
    { label: 'Inactive', value: inactive, color: theme.textMuted },
  ];

  return (
    <View
      accessibilityRole="summary"
      accessibilityLabel={`Parking space status: ${statuses
        .map((status) => `${status.label}, ${status.value}`)
        .join('; ')}`}
      style={styles.parkingStatus}>
      <View style={styles.parkingStatusList}>
        {statuses.map((status) => {
          const safeValue = Math.max(0, status.value);
          const percentage = total > 0 ? Math.min(100, (safeValue / total) * 100) : 0;

          return (
            <View key={status.label} style={styles.parkingStatusRow}>
              <View style={styles.parkingStatusLabelRow}>
                <Text variant="caption" color="textSecondary">
                  {status.label}
                </Text>
                <Text variant="caption" style={styles.parkingStatusPercentage}>
                  {formatPercentage(percentage)}
                </Text>
              </View>
              <View
                style={[styles.parkingStatusTrack, { backgroundColor: theme.surfaceSunken }]}>
                {percentage > 0 ? (
                  <View
                    style={[
                      styles.parkingStatusFill,
                      { backgroundColor: status.color, width: `${percentage}%` },
                    ]}
                  />
                ) : null}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function MovementOverview({
  checkIns,
  checkOuts,
  ringSize,
}: {
  checkIns: number;
  checkOuts: number;
  ringSize: number;
}) {
  const theme = useTheme();
  const safeCheckIns = Math.max(0, checkIns);
  const safeCheckOuts = Math.max(0, checkOuts);
  const total = safeCheckIns + safeCheckOuts;
  const checkInPercentage = total > 0 ? (safeCheckIns / total) * 100 : 0;
  const checkOutPercentage = total > 0 ? (safeCheckOuts / total) * 100 : 0;
  const ringUri = movementRingDataUri({
    size: ringSize,
    strokeWidth: ringSize < 120 ? 12 : 14,
    checkInPercentage,
    checkOutPercentage,
    trackColor: theme.surfaceSunken,
    checkInColor: theme.success,
    checkOutColor: theme.primary,
  });

  return (
    <View
      accessibilityRole="summary"
      accessibilityLabel={`${total} movements today: ${safeCheckIns} check-ins and ${safeCheckOuts} check-outs`}
      style={styles.movementOverview}>
      <View style={styles.movementMain}>
        <View
          style={[styles.movementRing, { width: ringSize, height: ringSize }]}>
          <Image
            pointerEvents="none"
            source={{ uri: ringUri }}
            contentFit="contain"
            cachePolicy="none"
            style={{ width: ringSize, height: ringSize }}
          />
          <View style={styles.movementRingLabel}>
            <Text variant="display" style={styles.movementRingValue} numberOfLines={1}>
              {total}
            </Text>
            <Text variant="caption" color="textMuted" style={styles.movementRingCaption}>
              Total{ringSize >= 120 ? '\nmovements' : ''}
            </Text>
          </View>
        </View>

        <View style={styles.movementMetrics}>
          <MovementMetricCard
            icon="carIn"
            label="Check-ins"
            value={safeCheckIns}
            percentage={checkInPercentage}
            color={theme.success}
            softColor={theme.successSoft}
          />
          <MovementMetricCard
            icon="carOut"
            label="Check-outs"
            value={safeCheckOuts}
            percentage={checkOutPercentage}
            color={theme.primary}
            softColor={theme.primarySoft}
          />
        </View>
      </View>

    </View>
  );
}

function MovementMetricCard({
  icon,
  label,
  value,
  percentage,
  color,
  softColor,
}: {
  icon: IconName;
  label: string;
  value: number;
  percentage: number;
  color: string;
  softColor: string;
}) {
  const theme = useTheme();
  const safePercentage = Math.min(100, Math.max(0, percentage));

  return (
    <View
      style={[
        styles.movementMetricCard,
        { backgroundColor: theme.surfaceAlt, borderColor: theme.border },
      ]}>
      <View style={styles.movementMetricTop}>
        <View style={[styles.movementMetricIcon, { backgroundColor: softColor }]}>
          <Icon name={icon} size={17} color={color} />
        </View>
        <View style={styles.movementMetricCopy}>
          <Text variant="label" numberOfLines={1}>
            {label}
          </Text>
          <View style={styles.movementPercentageRow}>
            <Text variant="caption" style={{ color }}>
              {formatPercentage(safePercentage)}
            </Text>
            <Text variant="caption" color="textMuted">
              of total
            </Text>
          </View>
        </View>
        <Text variant="heading" style={styles.movementMetricValue} numberOfLines={1}>
          {value}
        </Text>
      </View>
      <View
        style={[styles.movementMetricTrack, { backgroundColor: theme.surfaceSunken }]}>
        <View
          style={[
            styles.movementMetricFill,
            { width: `${safePercentage}%`, backgroundColor: color },
          ]}
        />
      </View>
    </View>
  );
}

function formatPercentage(value: number) {
  const rounded = Math.round(value * 10) / 10;
  return `${rounded}%`;
}

function movementRingDataUri({
  size,
  strokeWidth,
  checkInPercentage,
  checkOutPercentage,
  trackColor,
  checkInColor,
  checkOutColor,
}: {
  size: number;
  strokeWidth: number;
  checkInPercentage: number;
  checkOutPercentage: number;
  trackColor: string;
  checkInColor: string;
  checkOutColor: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;
  const checkInLength = (Math.min(100, Math.max(0, checkInPercentage)) / 100) * circumference;
  const checkOutLength = (Math.min(100, Math.max(0, checkOutPercentage)) / 100) * circumference;
  const checkInArc =
    checkInLength > 0
      ? `<circle cx="${center}" cy="${center}" r="${radius}" fill="none" stroke="${checkInColor}" stroke-width="${strokeWidth}" stroke-dasharray="${checkInLength} ${circumference - checkInLength}" transform="rotate(-90 ${center} ${center})"/>`
      : '';
  const checkOutArc =
    checkOutLength > 0
      ? `<circle cx="${center}" cy="${center}" r="${radius}" fill="none" stroke="${checkOutColor}" stroke-width="${strokeWidth}" stroke-dasharray="${checkOutLength} ${circumference - checkOutLength}" stroke-dashoffset="${-checkInLength}" transform="rotate(-90 ${center} ${center})"/>`
      : '';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${center}" cy="${center}" r="${radius}" fill="none" stroke="${trackColor}" stroke-width="${strokeWidth}"/>${checkInArc}${checkOutArc}</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const styles = StyleSheet.create({
  root: { gap: Spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  weekEndingLabel: { fontSize: 10, lineHeight: 13 },
  viewport: { overflow: 'hidden' },
  slide: { justifyContent: 'space-between', paddingRight: 1 },
  weeklyChart: { flex: 1, gap: 6 },
  weeklyValueHidden: { opacity: 0 },
  weeklyBody: { flex: 1, flexDirection: 'row', marginTop: 14 },
  weeklyYAxis: { position: 'relative' },
  weeklyYAxisLabel: { position: 'absolute', right: 6, marginTop: -6, fontSize: 10, lineHeight: 12 },
  weeklyPlotArea: { flex: 1, position: 'relative' },
  weeklyGridline: { position: 'absolute', left: 0, right: 0, height: StyleSheet.hairlineWidth },
  weeklyAxisLine: { position: 'absolute', left: 0, top: 0, bottom: 0, width: StyleSheet.hairlineWidth },
  weeklyPlot: { flex: 1, flexDirection: 'row', alignItems: 'stretch', gap: Spacing.sm, paddingHorizontal: Spacing.xs },
  weeklyBarColumn: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'flex-end' },
  weeklyBarValue: { position: 'absolute', left: 0, right: 0, marginBottom: 4, textAlign: 'center', fontSize: 11, lineHeight: 14 },
  occupancyBarFill: { width: 22, borderTopLeftRadius: Radius.sm, borderTopRightRadius: Radius.sm },
  weeklyLabels: { flexDirection: 'row' },
  weeklyLabel: { flex: 1, minWidth: 0, textAlign: 'center', fontSize: 10, lineHeight: 13 },
  weeklyEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  movementOverview: { flex: 1, justifyContent: 'center' },
  movementMain: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  movementRing: { position: 'relative', flexShrink: 0, alignItems: 'center', justifyContent: 'center' },
  movementRingLabel: { position: 'absolute', alignItems: 'center' },
  movementRingValue: { fontSize: 27, lineHeight: 30 },
  movementRingCaption: { fontSize: 10, lineHeight: 13, textAlign: 'center' },
  movementMetrics: { flex: 1, minWidth: 0, gap: Spacing.sm },
  movementMetricCard: { minHeight: 58, padding: Spacing.sm, borderWidth: 1, borderRadius: Radius.md, gap: 6 },
  movementMetricTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  movementMetricIcon: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.sm },
  movementMetricCopy: { flex: 1, minWidth: 0, gap: 1 },
  movementPercentageRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  movementMetricValue: { fontSize: 20, lineHeight: 23 },
  movementMetricTrack: { height: 5, borderRadius: Radius.pill, overflow: 'hidden' },
  movementMetricFill: { height: '100%', borderRadius: Radius.pill },
  dots: { minHeight: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: Radius.pill },
  dotActive: { width: 18 },
  parkingStatus: { flex: 1, gap: 7 },
  parkingStatusSubtitle: { fontSize: 10, lineHeight: 13 },
  parkingStatusList: { flex: 1, justifyContent: 'space-between' },
  parkingStatusRow: { gap: 3 },
  parkingStatusLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  parkingStatusPercentage: { fontWeight: '600' },
  parkingStatusTrack: { height: 5, borderRadius: Radius.pill, overflow: 'hidden' },
  parkingStatusFill: { height: '100%', minWidth: 4, borderRadius: Radius.pill },
});

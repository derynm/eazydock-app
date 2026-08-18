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
  DashboardDailyMovement,
  DashboardDailyParkingHours,
  DashboardMetrics,
} from '@/api/types';
import { ChartPalette, Radius, Spacing } from '@/constants/theme';
import { useScheme, useTheme } from '@/hooks/use-theme';

import { Icon, Text, type IconName } from '@/components/ui';

type Props = {
  metrics: DashboardMetrics;
  dailyParkingHours: DashboardDailyParkingHours[];
  dailyMovement: DashboardDailyMovement[];
  ringSize: number;
};

const slides = [
  { key: 'daily-occupancy', title: 'Weekly occupancy' },
  { key: 'parking-hours', title: 'Parking hours per day' },
  { key: 'movement-trend', title: 'Weekly movement trend' },
  { key: 'movement', title: 'Today’s movement' },
  { key: 'occupancy', title: 'Parking space status' },
] as const;

export function DashboardChartCarousel({ metrics, dailyParkingHours, dailyMovement, ringSize }: Props) {
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

            <View style={[styles.slide, { width, height: viewportHeight }]}> 
              <ParkingHoursChart daily={dailyParkingHours} />
            </View>

            <View style={[styles.slide, { width, height: viewportHeight }]}> 
              <MovementTrendChart daily={dailyMovement} />
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
// Wide enough for three-digit hour labels such as "100h" without clipping.
const Y_AXIS_WIDTH = 30;

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

function ParkingHoursChart({ daily }: { daily: DashboardDailyParkingHours[] }) {
  const theme = useTheme();
  const [pressedDate, setPressedDate] = useState<string | null>(null);
  const operatingDays = daily.filter((day) => day.is_operating_day);
  const values = operatingDays.map((day) => Math.max(0, day.total_parked_hours));
  const maxHours = Math.max(...values, 1);
  const axisMax = Math.max(25, Math.ceil(maxHours / 25) * 25);

  if (operatingDays.length === 0) {
    return <ChartEmpty message="No parking hours history available" />;
  }

  return (
    <View
      accessibilityRole="summary"
      accessibilityLabel={`Parking hours per day: ${operatingDays
        .map((day) => `${formatDayLabel(day.date)}, ${Math.round(day.total_parked_hours)} hours`)
        .join('; ')}`}
      style={styles.weeklyChart}>
      <View style={styles.weeklyBody}>
        <View style={[styles.weeklyYAxis, { width: Y_AXIS_WIDTH }]}> 
          {[axisMax, axisMax * 0.75, axisMax * 0.5, axisMax * 0.25, 0].map((value, index) => (
            <Text
              key={value}
              style={[styles.weeklyYAxisLabel, { color: theme.textMuted, top: `${8 + index * 21}%` }]}> 
              {formatHours(value)}
            </Text>
          ))}
        </View>
        <View style={styles.weeklyPlotArea}>
          {[8, 29, 50, 71, 92].map((top, index) => (
            <View
              key={top}
              style={[styles.weeklyGridline, {
                backgroundColor: index === 4 ? theme.borderStrong : theme.border,
                top: `${top}%`,
              }]}
            />
          ))}
          <Image
            pointerEvents="none"
            source={{ uri: parkingHoursLineDataUri(operatingDays, axisMax, theme.primary) }}
            contentFit="fill"
            cachePolicy="none"
            style={styles.lineChartImage}
          />
          <View style={styles.linePointOverlay} pointerEvents="box-none">
            {operatingDays.map((day, index) => {
              const x = ((index + 0.5) / operatingDays.length) * 100;
              const value = Math.min(axisMax, Math.max(0, day.total_parked_hours));
              const y = 92 - (value / axisMax) * 84;
              const isPressed = pressedDate === day.date;

              return (
                <Pressable
                  key={day.date}
                  accessibilityRole="button"
                  accessibilityLabel={`${formatDayLabel(day.date)}, ${formatHours(day.total_parked_hours)}`}
                  accessibilityHint="Hold to show parking hours"
                  onPressIn={() => setPressedDate(day.date)}
                  onPressOut={() => setPressedDate(null)}
                  style={[styles.linePointHitArea, { left: `${x}%`, top: `${y}%` }]}
                >
                  {isPressed ? (
                    <Text
                      variant="label"
                      style={[
                        styles.linePointValue,
                        {
                          color: theme.text,
                          backgroundColor: theme.surface,
                          borderColor: theme.border,
                        },
                      ]}
                      numberOfLines={1}>
                      {formatHours(day.total_parked_hours)}
                    </Text>
                  ) : null}
                  <View style={[styles.linePoint, { backgroundColor: theme.primary }]} />
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
      <ChartDayLabels
        days={operatingDays.map((day) => day.date)}
        plotAligned
        labelPullUp={Spacing.md}
      />
    </View>
  );
}

function parkingHoursLineDataUri(
  daily: DashboardDailyParkingHours[],
  axisMax: number,
  color: string,
) {
  const points = daily.map((day, index) => {
    const x = ((index + 0.5) / daily.length) * 100;
    const value = Math.min(axisMax, Math.max(0, day.total_parked_hours));
    const y = 92 - (value / axisMax) * 84;
    return { x, y };
  });
  const linePath = smoothChartPath(points);
  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];
  const areaPath = `${linePath} L${lastPoint.x},92 L${firstPoint.x},92 Z`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none"><defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity="0.28"/><stop offset="1" stop-color="${color}" stop-opacity="0.015"/></linearGradient></defs><path d="${areaPath}" fill="url(#area)"/><path d="${linePath}" fill="none" stroke="${color}" stroke-width="0.72" vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function smoothChartPath(points: Array<{ x: number; y: number }>) {
  if (points.length === 0) return '';
  if (points.length === 1) return `M${points[0].x},${points[0].y}`;

  let path = `M${points[0].x},${points[0].y}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];
    const previous = points[index - 1] ?? current;
    const afterNext = points[index + 2] ?? next;
    const segment = next.x - current.x;
    const previousSegment = next.x - previous.x || segment;
    const nextSegment = afterNext.x - current.x || segment;
    const currentSlope = (next.y - previous.y) / previousSegment;
    const nextSlope = (afterNext.y - current.y) / nextSegment;
    const lowerY = Math.min(current.y, next.y);
    const upperY = Math.max(current.y, next.y);
    const controlOne = {
      x: current.x + segment / 3,
      y: clampSplineY(current.y + currentSlope * segment / 3, lowerY, upperY),
    };
    const controlTwo = {
      x: next.x - segment / 3,
      y: clampSplineY(next.y - nextSlope * segment / 3, lowerY, upperY),
    };
    path += ` C${controlOne.x},${controlOne.y} ${controlTwo.x},${controlTwo.y} ${next.x},${next.y}`;
  }
  return path;
}

function clampSplineY(value: number, lower: number, upper: number) {
  return Math.min(upper, Math.max(lower, value));
}

function formatHours(value: number) {
  return `${Math.round(value)}h`;
}

function MovementTrendChart({ daily }: { daily: DashboardDailyMovement[] }) {
  const theme = useTheme();
  const [activeDate, setActiveDate] = useState<string | null>(null);
  const maxValue = Math.max(...daily.flatMap((day) => [day.car_in, day.car_out]), 1);

  if (daily.length === 0) {
    return <ChartEmpty message="No movement history available" />;
  }

  return (
    <View
      accessibilityRole="summary"
      accessibilityLabel={`Weekly movement trend: ${daily
        .map((day) => `${day.label}, ${day.car_in} check-ins, ${day.car_out} check-outs`)
        .join('; ')}`}
      style={styles.weeklyChart}>
      <View style={styles.trendLegend}>
        <LegendDot color={theme.success} label="Check-ins" />
        <LegendDot color={theme.primary} label="Check-outs" />
      </View>
      <View style={styles.weeklyBody}>
        <View style={[styles.weeklyYAxis, { width: Y_AXIS_WIDTH }]}> 
          {[maxValue, maxValue * 0.75, maxValue * 0.5, maxValue * 0.25, 0].map((value, index) => (
            <Text
              key={index}
              style={[styles.weeklyYAxisLabel, { color: theme.textMuted, top: `${index * 25}%` }]}> 
              {Math.round(value)}
            </Text>
          ))}
        </View>
        <View style={styles.weeklyPlotArea}>
          {[0, 25, 50, 75, 100].map((top, index) => (
            <View
              key={top}
              style={[styles.weeklyGridline, {
                backgroundColor: index === 4 ? theme.borderStrong : theme.border,
                top: `${top}%`,
              }]}
            />
          ))}
          <View style={[styles.weeklyPlot, styles.movementPlot]}>
            {daily.map((day) => (
              <Pressable
                key={day.date}
                accessibilityRole="button"
                accessibilityLabel={`${day.label}: ${day.car_in} check-ins, ${day.car_out} check-outs`}
                onHoverIn={() => setActiveDate(day.date)}
                onHoverOut={() => setActiveDate(null)}
                onPressIn={() => setActiveDate(day.date)}
                onPressOut={() => setActiveDate(null)}
                style={styles.trendColumn}>
                {activeDate === day.date ? (
                  <View
                    pointerEvents="none"
                    style={[
                      styles.trendValueTooltip,
                      {
                        bottom: `${(Math.max(day.car_in, day.car_out) / maxValue) * 100}%`,
                        backgroundColor: theme.surface,
                        borderColor: theme.border,
                      },
                    ]}>
                    <Text style={[styles.trendValue, { color: theme.success }]}>{day.car_in}</Text>
                    <Text style={[styles.trendValue, { color: theme.primary }]}>{day.car_out}</Text>
                  </View>
                ) : null}
                <View style={styles.trendBars}>
                  <View style={[styles.trendBar, { backgroundColor: theme.success, height: `${(day.car_in / maxValue) * 100}%` }]} />
                  <View style={[styles.trendBar, { backgroundColor: theme.primary, height: `${(day.car_out / maxValue) * 100}%` }]} />
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
      <ChartDayLabels
        days={daily.map((day) => day.date)}
        labels={daily.map((day) => day.label)}
        horizontalBleed={Spacing.sm}
      />
    </View>
  );
}

function ChartDayLabels({
  days,
  labels,
  plotAligned = false,
  horizontalBleed = 0,
  labelPullUp = 0,
}: {
  days: string[];
  labels?: string[];
  plotAligned?: boolean;
  horizontalBleed?: number;
  labelPullUp?: number;
}) {
  return (
    <View style={[styles.weeklyLabels, {
      paddingLeft: plotAligned ? Y_AXIS_WIDTH : Y_AXIS_WIDTH + Spacing.xs,
      paddingRight: plotAligned ? 0 : Spacing.xs,
      marginLeft: -horizontalBleed,
      marginRight: -horizontalBleed,
      marginTop: -labelPullUp,
    }]}> 
      {(labels ?? days.map(formatDayLabel)).map((label, index) => (
        <Text key={days[index]} variant="caption" color="textMuted" style={styles.weeklyLabel} numberOfLines={1}>
          {label}
        </Text>
      ))}
    </View>
  );
}

function ChartEmpty({ message }: { message: string }) {
  return (
    <View style={styles.weeklyEmpty}>
      <Text variant="body" color="textMuted">{message}</Text>
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text variant="caption" color="textMuted">{label}</Text>
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
  trendLegend: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 7, height: 7, borderRadius: Radius.pill },
  weeklyValueHidden: { opacity: 0 },
  weeklyBody: { flex: 1, flexDirection: 'row', marginTop: 14 },
  weeklyYAxis: { position: 'relative' },
  weeklyYAxisLabel: { position: 'absolute', right: 4, marginTop: -5, fontSize: 9, lineHeight: 11 },
  weeklyPlotArea: { flex: 1, position: 'relative' },
  weeklyGridline: { position: 'absolute', left: 0, right: 0, height: StyleSheet.hairlineWidth },
  weeklyAxisLine: { position: 'absolute', left: 0, top: 0, bottom: 0, width: StyleSheet.hairlineWidth },
  weeklyPlot: { flex: 1, flexDirection: 'row', alignItems: 'stretch', gap: Spacing.sm, paddingHorizontal: Spacing.xs },
  weeklyBarColumn: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'flex-end' },
  weeklyBarValue: { position: 'absolute', left: 0, right: 0, marginBottom: 4, textAlign: 'center', fontSize: 11, lineHeight: 14 },
  occupancyBarFill: { width: 22, borderTopLeftRadius: Radius.sm, borderTopRightRadius: Radius.sm },
  lineChartImage: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  linePointOverlay: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  linePointHitArea: {
    position: 'absolute',
    width: 28,
    height: 28,
    marginLeft: -14,
    marginTop: -14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linePoint: { width: 6, height: 6, borderRadius: Radius.pill },
  linePointValue: {
    position: 'absolute',
    bottom: 22,
    minWidth: 34,
    textAlign: 'center',
    borderRadius: Radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 5,
    paddingVertical: 3,
    fontSize: 10,
    lineHeight: 13,
  },
  trendColumn: { flex: 1, minWidth: 0, position: 'relative', alignItems: 'center', justifyContent: 'flex-end' },
  trendBars: { height: '100%', position: 'relative', flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
  trendBar: { width: 8, minHeight: 2, borderTopLeftRadius: Radius.sm, borderTopRightRadius: Radius.sm },
  movementPlot: { marginLeft: -Spacing.sm, marginRight: -Spacing.sm },
  trendValueTooltip: {
    position: 'absolute',
    left: '50%',
    width: 36,
    marginLeft: -18,
    zIndex: 2,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderWidth: 1,
    borderRadius: Radius.sm,
  },
  trendValue: { fontSize: 10, lineHeight: 12, fontWeight: '600' },
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

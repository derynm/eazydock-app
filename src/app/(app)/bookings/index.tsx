import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { listBookingsBySpace } from '@/api/bookings';
import { lookupParkingAreas } from '@/api/lookups';
import type { Booking, BookingsBySpaceGroup, SpaceStatus } from '@/api/types';
import { Screen } from '@/components/screen';
import { Banner, Button, FilterSheet, IconButton, SearchBar, Segmented, Select, Text } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { usePermissions } from '@/hooks/use-permissions';
import { useResponsive } from '@/hooks/use-responsive';
import { useScheme, useTheme } from '@/hooks/use-theme';
import { useSession } from '@/auth/session';
import { formatPlate, formatTime } from '@/lib/format';

// ── Date helpers ──────────────────────────────────────────────────────
function toISODate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function formatNavDate(d: Date): string {
  const todayStr = toISODate(new Date());
  const dStr = toISODate(d);
  const label = new Intl.DateTimeFormat(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
  }).format(d);
  if (dStr === todayStr) return `Today  ·  ${label}`;
  if (dStr === toISODate(addDays(new Date(), 1))) return `Tomorrow  ·  ${label}`;
  if (dStr === toISODate(addDays(new Date(), -1))) return `Yesterday  ·  ${label}`;
  return label;
}

const FILTERS = [
  { value: '', label: 'All' },
  { value: 'available', label: 'Available' },
  { value: 'booked', label: 'Booked' },
  { value: 'occupied', label: 'Occupied' },
] as const;

// ── Grid geometry ─────────────────────────────────────────────────────
const ROW_H = 52;
const TIME_COL_W = 84;
const CELL_W = 96;
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const BLOCK_INSET = 3;
// Tall enough to always fit all 4 detail lines (time, driver, plate, tenant),
// even for a 1-hour booking — so short bookings never get truncated.
const BLOCK_MIN_H = ROW_H;
const BLOCK_LINE_H = 11;
const BLOCK_V_PADDING = 4;

function fullHourLabel(h: number): string {
  const period = h < 12 ? 'AM' : 'PM';
  const displayHour = h % 12 === 0 ? 12 : h % 12;
  return `${displayHour}:00 ${period}`;
}

type BookingSegment = {
  booking: Booking;
  top: number;
  height: number;
  status: SpaceStatus;
};

/**
 * Merges a space's bookings for the selected day into vertically-stacked
 * blocks (one per booking, spanning its full duration) instead of one dot
 * per hour cell — avoids the disconnected-pill look for multi-hour bookings.
 */
function daySegments(bookings: Booking[], selectedDate: Date): BookingSegment[] {
  const dayStart = new Date(selectedDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart.getTime() + 24 * 3_600_000);

  const segments: BookingSegment[] = [];
  for (const b of bookings) {
    if (b.status === 'cancelled' || b.status === 'expired') continue;
    const s = new Date(b.starts_at);
    const e = new Date(b.ends_at);
    if (e <= dayStart || s >= dayEnd) continue;

    const clippedStart = s < dayStart ? dayStart : s;
    const clippedEnd = e > dayEnd ? dayEnd : e;
    const startHour = (clippedStart.getTime() - dayStart.getTime()) / 3_600_000;
    const endHour = (clippedEnd.getTime() - dayStart.getTime()) / 3_600_000;

    segments.push({
      booking: b,
      top: startHour * ROW_H,
      height: Math.max((endHour - startHour) * ROW_H, BLOCK_MIN_H),
      status: b.status === 'fulfilled' ? 'occupied' : 'booked',
    });
  }
  return segments;
}

/** Time range, driver, plate, tenant — in priority order, trimmed to whatever fits the block's height. */
function bookingLines(booking: Booking): string[] {
  const lines = [
    `${formatTime(booking.starts_at)}–${formatTime(booking.ends_at)}`,
    booking.driver?.full_name || booking.contact_name || undefined,
    formatPlate(booking.plate_number_raw) || undefined,
    booking.tenant?.name || undefined,
  ];
  return lines.filter((l): l is string => !!l);
}

// ── Sub-components ────────────────────────────────────────────────────

/** Column header — space code only; per-hour status lives in the grid cells below. */
function ColHeader({ group, colW }: { group: BookingsBySpaceGroup; colW: number }) {
  const theme = useTheme();
  return (
    <View style={[styles.colHead, { width: colW, borderRightColor: theme.borderStrong }]}>
      <Text variant="label" numberOfLines={1}>{group.space_code}</Text>
    </View>
  );
}

/**
 * A booked or occupied slot rendered as one inset card spanning its full
 * duration — translucent tint (hour gridlines still read through), a
 * colored left accent bar, and as many detail lines as the height fits.
 */
function BookingBlock({ segment, colW, onPress }: { segment: BookingSegment; colW: number; onPress: () => void }) {
  const theme = useTheme();
  const { booking, top, height, status } = segment;
  const isOccupied = status === 'occupied';
  const accent = isOccupied ? theme.info : theme.warning;
  const fill = isOccupied ? theme.infoSoft : theme.warningSoft;
  const lines = bookingLines(booking);
  const maxLines = Math.max(1, Math.floor((height - BLOCK_V_PADDING * 2) / BLOCK_LINE_H));
  const visibleLines = lines.slice(0, maxLines);

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      style={[
        styles.block,
        {
          top,
          height,
          width: colW - BLOCK_INSET * 2,
          left: BLOCK_INSET,
          backgroundColor: fill,
          borderLeftWidth: 3,
          borderLeftColor: accent,
        },
      ]}>
      {visibleLines.map((line, i) => (
        <Text
          key={i}
          numberOfLines={1}
          ellipsizeMode="tail"
          style={[styles.blockLine, { color: theme.text, fontWeight: i === 0 ? '700' : '400' }]}>
          {line}
        </Text>
      ))}
    </TouchableOpacity>
  );
}

/** One space's full-day column: hour gridlines behind, booking blocks overlaid on top. */
function GridColumn({
  group,
  colW,
  selectedDate,
  isToday,
  nowHour,
  onPressBooking,
}: {
  group: BookingsBySpaceGroup;
  colW: number;
  selectedDate: Date;
  isToday: boolean;
  nowHour: number;
  onPressBooking: (booking: Booking) => void;
}) {
  const theme = useTheme();
  const segments = useMemo(() => daySegments(group.bookings, selectedDate), [group.bookings, selectedDate]);

  return (
    <View
      style={[
        styles.gridColumn,
        {
          width: colW,
          height: ROW_H * HOURS.length,
          borderRightColor: theme.borderStrong,
        },
      ]}>
      {HOURS.map((h) => (
        <View
          key={h}
          style={[
            styles.gridRowBg,
            {
              height: ROW_H,
              borderBottomColor: theme.border,
              backgroundColor: isToday && h === nowHour ? theme.primarySoft : 'transparent',
            },
          ]}
        />
      ))}
      {segments.map((seg) => (
        <BookingBlock
          key={seg.booking.id}
          segment={seg}
          colW={colW}
          onPress={() => onPressBooking(seg.booking)}
        />
      ))}
    </View>
  );
}

function LegendItem({ color, outline, label }: { color: string; outline?: boolean; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, outline ? { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: color } : { backgroundColor: color }]} />
      <Text variant="caption" color="textMuted">{label}</Text>
    </View>
  );
}

function Legend() {
  const theme = useTheme();
  return (
    <View style={styles.legend}>
      <LegendItem color={theme.border} outline label="Available" />
      <LegendItem color={theme.warning} label="Booked" />
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────
export default function BookingsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const scheme = useScheme();
  const insets = useSafeAreaInsets();
  const { can } = usePermissions();
  const { isTablet } = useResponsive();
  const { selectedBuilding } = useSession();
  const { width: screenWidth } = useWindowDimensions();
  const vScrollRef = useRef<ScrollView>(null);
  const headerHRef = useRef<ScrollView>(null);
  const bodyHRef = useRef<ScrollView>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [areaId, setAreaId] = useState<number | null>(null);
  const [showFilter, setShowFilter] = useState(false);
  const hasFilters = search !== '' || status !== '' || areaId !== null;
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [iosDateOpen, setIosDateOpen] = useState(false);
  const [draftDate, setDraftDate] = useState(selectedDate);
  const debounced = useDebouncedValue(search);
  const dateStr = toISODate(selectedDate);
  const isToday = dateStr === toISODate(new Date());
  const nowHour = new Date().getHours();

  const { data: areas = [] } = useQuery({
    queryKey: ['lookup-areas', selectedBuilding?.id],
    queryFn: () => lookupParkingAreas(selectedBuilding?.id),
  });
  const areaOptions = [{ label: 'All areas', value: 0 }, ...areas.map((a) => ({ label: a.name, value: a.id }))];

  const {
    data: groups = [],
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['bookings-by-space', dateStr, debounced, status, selectedBuilding?.id, areaId],
    queryFn: () => listBookingsBySpace({
      date: dateStr,
      status: (status || undefined) as SpaceStatus | undefined,
      building_id: selectedBuilding?.id,
      parking_area_id: areaId || undefined,
      search: debounced || undefined,
    }),
  });

  const sortedGroups = [...groups].sort((a, b) =>
    a.space_code.localeCompare(b.space_code, undefined, { numeric: true, sensitivity: 'base' }),
  );
  const totalBookings = groups.reduce((sum, g) => sum + g.bookings.length, 0);
  const count = sortedGroups.length;
  const availableW = screenWidth - TIME_COL_W;
  const colW = count > 0 && count * CELL_W < availableW
    ? Math.floor(availableW / count)
    : CELL_W;

  const goToDate = (d: Date) => {
    setSelectedDate(d);
    const isTargetToday = toISODate(d) === toISODate(new Date());
    const offset = isTargetToday
      ? Math.max((new Date().getHours() - 1) * ROW_H, 0)
      : 8 * ROW_H; // 8 AM for other days
    setTimeout(() => vScrollRef.current?.scrollTo({ y: offset, animated: false }), 150);
  };

  const openDatePicker = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: selectedDate,
        mode: 'date',
        onChange: (_, picked) => { if (picked) goToDate(picked); },
      });
    } else {
      setDraftDate(selectedDate);
      setIosDateOpen(true);
    }
  };

  // Scroll to 1 hour before now on mount
  useEffect(() => {
    const offset = Math.max((new Date().getHours() - 1) * ROW_H, 0);
    const t = setTimeout(() => vScrollRef.current?.scrollTo({ y: offset, animated: false }), 150);
    return () => clearTimeout(t);
  }, []);

  // Sync horizontal scroll: body → header
  const onBodyScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    headerHRef.current?.scrollTo({ x: e.nativeEvent.contentOffset.x, animated: false });
  };

  return (
    <Screen
      title="Bookings"
      subtitle={count ? `${count} spaces · ${totalBookings} booking${totalBookings === 1 ? '' : 's'}` : undefined}
      headerRight={
        <View style={styles.headerActions}>
          <View>
            <IconButton name="filter" accessibilityLabel="Filter bookings" surface onPress={() => setShowFilter(true)} />
            {hasFilters && <View style={[styles.filterDot, { backgroundColor: theme.primary }]} />}
          </View>
          {can('operations.bookings', 'create') && (
            isTablet ? (
              <Button title="New booking" icon="add" size="sm" onPress={() => router.push('/bookings/create')} />
            ) : (
              <IconButton name="add" accessibilityLabel="New booking" surface onPress={() => router.push('/bookings/create')} />
            )
          )}
        </View>
      }>
      <View style={styles.root}>
        {/* Date navigation */}
        <View style={[styles.dateNav, { borderBottomColor: theme.border }]}>
          <IconButton name="chevronLeft" accessibilityLabel="Previous day" onPress={() => goToDate(addDays(selectedDate, -1))} />
          <TouchableOpacity onPress={() => goToDate(new Date())} style={styles.dateLabel}>
            <Text variant="subtitle" numberOfLines={1}>{formatNavDate(selectedDate)}</Text>
          </TouchableOpacity>
          <IconButton name="chevronRight" accessibilityLabel="Next day" onPress={() => goToDate(addDays(selectedDate, 1))} />
          <IconButton name="bookings" accessibilityLabel="Choose date" onPress={openDatePicker} />
        </View>

        <Legend />

        {isError ? (
          <Banner title="Couldn’t load bookings" message={error?.message} tone="danger" actionLabel="Retry" onAction={refetch} />
        ) : null}

        {/* Fixed column headers — one per parking space, scrolls horizontally in sync */}
        <View style={[styles.headRow, { borderBottomColor: theme.border }]}>
          <View style={[styles.timespacer, { borderRightColor: theme.borderStrong }]} />
          <ScrollView
            ref={headerHRef}
            horizontal
            scrollEnabled={false}
            showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row' }}>
              {sortedGroups.map((g) => <ColHeader key={g.parking_space_id} group={g} colW={colW} />)}
            </View>
          </ScrollView>
        </View>

        {/* Time grid — vertical scroll */}
        <ScrollView
          ref={vScrollRef}
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.primary} />
          }>
          <View style={{ flexDirection: 'row' }}>
            {/* Fixed time labels column */}
            <View style={[styles.timeline, { borderRightColor: theme.borderStrong }]}>
              {HOURS.map((h) => (
                <View
                  key={h}
                  style={[
                    styles.timeCell,
                    { height: ROW_H, backgroundColor: isToday && h === nowHour ? theme.primarySoft : 'transparent' },
                  ]}>
                  <Text variant="caption" color="textMuted">{fullHourLabel(h)}</Text>
                </View>
              ))}
            </View>

            {/* Space columns — horizontal scroll synced with header */}
            <ScrollView
              ref={bodyHRef}
              horizontal
              style={{ flex: 1 }}
              onScroll={onBodyScroll}
              scrollEventThrottle={16}
              showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', minWidth: availableW }}>
                {sortedGroups.map((g) => (
                  <GridColumn
                    key={g.parking_space_id}
                    group={g}
                    colW={colW}
                    selectedDate={selectedDate}
                    isToday={isToday}
                    nowHour={nowHour}
                    onPressBooking={(booking) => router.push(`/bookings/${booking.id}`)}
                  />
                ))}
              </View>
            </ScrollView>
          </View>
        </ScrollView>
      </View>

      <FilterSheet visible={showFilter} onClose={() => setShowFilter(false)} title="Filter bookings">
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search plate, ref, contact…" />
        <Select value={areaId ?? 0} options={areaOptions} onChange={(v) => setAreaId((v as number) || null)} placeholder="All areas" />
        <Segmented scrollable options={FILTERS as never} value={status} onChange={setStatus} />
      </FilterSheet>

      {Platform.OS === 'ios' ? (
        <Modal visible={iosDateOpen} transparent animationType="fade" onRequestClose={() => setIosDateOpen(false)}>
          <View style={[styles.scrim, { backgroundColor: theme.scrim }]}>
            <Pressable style={styles.backdrop} onPress={() => setIosDateOpen(false)} />
            <View style={[styles.sheet, { backgroundColor: theme.surface, paddingBottom: Spacing.lg + insets.bottom }]}>
              <DateTimePicker
                value={draftDate}
                mode="date"
                display="spinner"
                onChange={(_, d) => d && setDraftDate(d)}
                themeVariant={scheme}
                style={styles.picker}
              />
              <Button
                title="Confirm"
                icon="check"
                onPress={() => {
                  goToDate(draftDate);
                  setIosDateOpen(false);
                }}
                fullWidth
              />
            </View>
          </View>
        </Modal>
      ) : null}
    </Screen>
  );
}

// ── Styles ────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },

  // Header actions row (filter + add)
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  filterDot: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  // Date navigation
  dateNav: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dateLabel: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },

  // Legend
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 3 },

  // Header row (fixed)
  headRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  timespacer: {
    width: TIME_COL_W,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  colHead: {
    paddingVertical: 10,
    paddingHorizontal: Spacing.sm,
    borderRightWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },

  // Scrollable grid
  scroll: { flex: 1 },
  timeline: {
    width: TIME_COL_W,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  timeCell: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: Spacing.sm,
  },

  // Column background hour rows
  gridColumn: {
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  gridRowBg: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },

  // Booking block overlaid on a column — inset card, translucent fill, left accent bar
  block: {
    position: 'absolute',
    paddingHorizontal: 6,
    paddingVertical: BLOCK_V_PADDING,
    borderRadius: Radius.sm,
    justifyContent: 'center',
  },
  blockLine: {
    fontSize: 9,
    lineHeight: BLOCK_LINE_H,
  },

  // Date picker sheet (iOS)
  scrim: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  sheet: { padding: Spacing.lg, gap: Spacing.md, borderTopLeftRadius: Radius.lg, borderTopRightRadius: Radius.lg },
  picker: { width: '100%', height: 216 },
});

import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';

import { listBookings } from '@/api/bookings';
import type { Booking } from '@/api/types';
import { Screen } from '@/components/screen';
import { Button, IconButton, SearchBar, Segmented, Text } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { usePaginatedList } from '@/hooks/use-paginated-list';
import { usePermissions } from '@/hooks/use-permissions';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { formatTime } from '@/lib/format';

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
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'fulfilled', label: 'Fulfilled' },
  { value: 'cancelled', label: 'Cancelled' },
] as const;

// ── Per-booking color palette (cycles by id) ─────────────────────────
const PALETTE = [
  '#4A90D9', // blue
  '#E67E22', // orange
  '#27AE60', // green
  '#8E44AD', // purple
  '#E74C3C', // red
  '#16A085', // teal
  '#F39C12', // amber
  '#2471A3', // navy
];
function bookingColor(id: number): string {
  return PALETTE[id % PALETTE.length];
}

// ── Calendar geometry ─────────────────────────────────────────────────
const HOUR_H = 64;
const TIMELINE_W = 52;
const COLUMN_W = 110;   // each booking gets its own column
const BAR_W = 4;
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const GRID_H = 24 * HOUR_H;

// ── Helpers ───────────────────────────────────────────────────────────
function hourLabel(h: number): string {
  if (h === 0) return '';
  if (h < 12) return `${h} AM`;
  if (h === 12) return '12 PM';
  return `${h - 12} PM`;
}

function eventGeometry(startsAt: string, endsAt: string) {
  const s = new Date(startsAt);
  const e = new Date(endsAt);
  const top = (s.getHours() + s.getMinutes() / 60) * HOUR_H;
  const dh = (e.getTime() - s.getTime()) / 3_600_000;
  return { top, height: Math.max(dh * HOUR_H, 48) };
}

// ── Sub-components ────────────────────────────────────────────────────

/** Column header — space code only */
function ColHeader({ booking, colW }: { booking: Booking; colW: number }) {
  const theme = useTheme();
  const color = bookingColor(booking.id);
  return (
    <View style={[styles.colHead, { width: colW, borderRightColor: theme.borderStrong, borderBottomColor: color }]}>
      <Text variant="label" numberOfLines={1}>
        {booking.parking_space?.space_code ?? '—'}
      </Text>
    </View>
  );
}

/** Event block — time range, plate, driver, tenant */
function ColEvent({ booking, onPress }: { booking: Booking; onPress: () => void }) {
  const { top, height } = eventGeometry(booking.starts_at, booking.ends_at);
  const color = bookingColor(booking.id);
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[styles.colEvent, { top, height, backgroundColor: color + '18', borderColor: color + '55' }]}>
      <View style={[styles.colEventBar, { backgroundColor: color }]} />
      <View style={styles.colEventBody}>
        <Text variant="caption" numberOfLines={1} style={styles.colEventTime}>
          {`${formatTime(booking.starts_at)} – ${formatTime(booking.ends_at)}`}
        </Text>
        <Text variant="caption" numberOfLines={1}>{booking.plate_number_raw}</Text>
        <Text variant="caption" numberOfLines={1}>{booking.driver?.full_name ?? '—'}</Text>
        {booking.tenant?.name ? (
          <Text variant="caption" numberOfLines={1} color="textMuted">{booking.tenant.name}</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

/** Red "now" line across the full columns width */
function NowLine() {
  const theme = useTheme();
  const now = new Date();
  const top = (now.getHours() + now.getMinutes() / 60) * HOUR_H;
  return (
    <View style={[styles.nowLine, { top }]} pointerEvents="none">
      <View style={[styles.nowDot, { backgroundColor: theme.danger }]} />
      <View style={[styles.nowBar, { backgroundColor: theme.danger }]} />
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────
export default function BookingsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { can } = usePermissions();
  const { isTablet } = useResponsive();
  const { width: screenWidth } = useWindowDimensions();
  const vScrollRef = useRef<ScrollView>(null);
  const headerHRef = useRef<ScrollView>(null);
  const bodyHRef = useRef<ScrollView>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const hasFilters = search !== '' || status !== '';
  const slideAnim = useRef(new Animated.Value(400)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const openFilter = () => {
    setShowFilter(true);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, damping: 26, stiffness: 220, useNativeDriver: true }),
    ]).start();
  };

  const closeFilter = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 160, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 400, duration: 200, useNativeDriver: true }),
    ]).start(() => setShowFilter(false));
  };
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const debounced = useDebouncedValue(search);
  const dateStr = toISODate(selectedDate);

  const list = usePaginatedList(['bookings', dateStr, debounced, status], listBookings, {
    search: debounced || undefined,
    status: status || undefined,
    date: dateStr,
  });

  const count = list.items.length;
  const availableW = screenWidth - TIMELINE_W;
  const colW = count > 0 && count * COLUMN_W < availableW
    ? Math.floor(availableW / count)
    : COLUMN_W;

  const goToDate = (d: Date) => {
    setSelectedDate(d);
    const isToday = toISODate(d) === toISODate(new Date());
    const offset = isToday
      ? Math.max((new Date().getHours() - 1) * HOUR_H, 0)
      : 8 * HOUR_H; // 8 AM for other days
    setTimeout(() => vScrollRef.current?.scrollTo({ y: offset, animated: false }), 150);
  };

  // Scroll to 1 hour before now on mount
  useEffect(() => {
    const offset = Math.max((new Date().getHours() - 1) * HOUR_H, 0);
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
      subtitle={list.total ? `${list.total} total` : undefined}
      headerRight={
        <View style={styles.headerActions}>
          <View>
            <IconButton name="filter" accessibilityLabel="Filter bookings" surface onPress={openFilter} />
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
        </View>

        {/* Fixed column headers — one per booking, scrolls horizontally in sync */}
        <View style={[styles.headRow, { borderBottomColor: theme.border }]}>
          <View style={[styles.timespacer, { borderRightColor: theme.borderStrong }]} />
          <ScrollView
            ref={headerHRef}
            horizontal
            scrollEnabled={false}
            showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row' }}>
              {list.items.map((b) => <ColHeader key={b.id} booking={b} colW={colW} />)}
            </View>
          </ScrollView>
        </View>

        {/* Time grid — vertical scroll */}
        <View style={{ flex: 1 }}>
          <ScrollView
            ref={vScrollRef}
            style={styles.scroll}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={list.isRefetching} onRefresh={list.refetch} tintColor={theme.primary} />
            }>
            <View style={{ flexDirection: 'row', height: GRID_H }}>
              {/* Fixed time labels column — labels absolutely positioned ON the hour lines */}
              <View style={[styles.timeline, { borderRightColor: theme.borderStrong }]}>
                {HOURS.filter(h => h > 0).map((h) => (
                  <Text
                    key={h}
                    variant="caption"
                    color="textMuted"
                    style={[styles.hourText, { top: h * HOUR_H - 8 }]}>
                    {hourLabel(h)}
                  </Text>
                ))}
              </View>

              {/* Booking columns — horizontal scroll synced with header */}
              <ScrollView
                ref={bodyHRef}
                horizontal
                style={{ flex: 1 }}
                onScroll={onBodyScroll}
                scrollEventThrottle={16}
                showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', height: GRID_H, minWidth: availableW }}>
                  {/* Hour + half-hour lines covering full width */}
                  <View style={[StyleSheet.absoluteFill, { width: Math.max(colW * count, availableW) }]} pointerEvents="none">
                    {HOURS.map((h) => (
                      <View key={h} style={[styles.hLine, { top: h * HOUR_H, borderColor: theme.borderStrong }]} />
                    ))}
                    {HOURS.map((h) => (
                      <View key={`hf-${h}`} style={[styles.hLineHalf, { top: h * HOUR_H + HOUR_H / 2, borderColor: theme.borderStrong }]} />
                    ))}
                    <NowLine />
                  </View>

                  {/* One column per booking */}
                  {list.items.map((b) => (
                    <View key={b.id} style={[styles.colContainer, { width: colW, borderRightColor: theme.borderStrong }]}>
                      <ColEvent booking={b} onPress={() => router.push(`/bookings/${b.id}`)} />
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>
          </ScrollView>

        </View>
      </View>

      {/* Filter bottom sheet */}
      <Modal visible={showFilter} animationType="none" transparent onRequestClose={closeFilter}>
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <Animated.View style={[StyleSheet.absoluteFill, styles.backdropFill, { opacity: fadeAnim }]}>
            <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closeFilter} />
          </Animated.View>
          <Animated.View style={[styles.sheet, { backgroundColor: theme.surface, transform: [{ translateY: slideAnim }] }]}>
            <View style={[styles.sheetHandle, { backgroundColor: theme.border }]} />
            <SearchBar value={search} onChangeText={setSearch} placeholder="Search plate, ref, contact…" />
            <Segmented scrollable options={FILTERS as never} value={status} onChange={setStatus} />
          </Animated.View>
        </View>
      </Modal>
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

  // Filter bottom sheet
  backdropFill: { backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
    gap: Spacing.sm,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Spacing.xs,
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

  // Header row (fixed)
  headRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  timespacer: {
    width: TIMELINE_W,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  colHead: {
    paddingVertical: 8,
    paddingHorizontal: Spacing.sm,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: 2,
    gap: 1,
  },

  // Scrollable grid
  scroll: { flex: 1 },
  timeline: {
    width: TIMELINE_W,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  hourText: {
    position: 'absolute',
    right: Spacing.sm,
    fontSize: 11,
    fontWeight: '600',
  },

  // Booking column
  colContainer: {
    width: COLUMN_W,
    height: GRID_H,
    position: 'relative',
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  colEvent: {
    position: 'absolute',
    left: 3,
    right: 3,
    borderRadius: Radius.sm,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingVertical: 4,
    overflow: 'hidden',
  },
  colEventBar: {
    width: BAR_W,
    alignSelf: 'stretch',
    marginRight: 4,
  },
  colEventBody: {
    flex: 1,
    gap: 1,
    overflow: 'hidden',
  },
  colEventTime: {
    fontWeight: '600',
  },

  // Hour lines
  hLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: 1,
  },
  hLineHalf: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    opacity: 0.6,
  },

  // Now line
  nowLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  },
  nowDot: { width: 8, height: 8, borderRadius: 4 },
  nowBar: { flex: 1, height: 2 },
});

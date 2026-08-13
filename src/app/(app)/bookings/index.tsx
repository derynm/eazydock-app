import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { getBooking, listBookings, listBookingsBySpace } from '@/api/bookings';
import { lookupParkingAreas } from '@/api/lookups';
import type { Booking, BookingsBySpaceGroup, SpaceStatus } from '@/api/types';
import { useSession } from '@/auth/session';
import { ResponsiveListDetail } from '@/components/responsive-list-detail';
import { Screen } from '@/components/screen';
import {
  Badge,
  Banner,
  Button,
  FilterSheet,
  Icon,
  IconButton,
  ListRow,
  PickerSheetModal,
  SearchBar,
  Segmented,
  Select,
  Skeleton,
  Text,
  ViewModeToggle,
  type ViewMode,
} from '@/components/ui';
import { BookingCalendarColors, Radius, Shadow, Spacing } from '@/constants/theme';
import { BookingDetail, FulfilModal } from '@/features/bookings/booking-detail';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { usePaginatedList } from '@/hooks/use-paginated-list';
import { usePermissions } from '@/hooks/use-permissions';
import { useResponsive } from '@/hooks/use-responsive';
import { useScheme, useTheme } from '@/hooks/use-theme';
import { formatPlate, formatTime } from '@/lib/format';
import { statusMeta } from '@/lib/status';
import {
  dateValueFromPicker,
  pickerDateFromSydneyValue,
  sydneyNowPickerDate,
  toSydneyDateTimeValue,
} from '@/lib/sydney-time';

// ── Date helpers ──────────────────────────────────────────────────────
function toISODate(d: Date): string {
  return dateValueFromPicker(d);
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function formatNavDate(d: Date): string {
  const today = sydneyNowPickerDate();
  const todayStr = toISODate(today);
  const dStr = toISODate(d);
  const label = new Intl.DateTimeFormat(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
  }).format(d);
  if (dStr === todayStr) return `Today  ·  ${label}`;
  if (dStr === toISODate(addDays(today, 1))) return `Tomorrow  ·  ${label}`;
  if (dStr === toISODate(addDays(today, -1))) return `Yesterday  ·  ${label}`;
  return label;
}

function formatCompactNavDate(d: Date): string {
  return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' }).format(d);
}

const BOARD_FILTERS = [
  { value: '', label: 'All' },
  { value: 'available', label: 'Available' },
  { value: 'booked', label: 'Booked' },
  { value: 'occupied', label: 'Occupied' },
] as const;

const LIST_FILTERS = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'fulfilled', label: 'Fulfilled' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'expired', label: 'Expired' },
] as const;

// ── Grid geometry ─────────────────────────────────────────────────────
const ROW_H = 52;
const PHONE_ROW_H = 64;
const TIME_COL_W = 84;
const PHONE_TIME_COL_W = 70;
const CELL_W = 96;
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const BLOCK_INSET = 3;
// Tall enough to always fit all 4 detail lines (time, driver, plate, tenant),
// even for a 1-hour booking — so short bookings never get truncated.
const BLOCK_LINE_H = 11;
const BLOCK_V_PADDING = 4;

function fullHourLabel(h: number, compact = false): string {
  const period = h < 12 ? 'AM' : 'PM';
  const displayHour = h % 12 === 0 ? 12 : h % 12;
  return `${displayHour}${compact ? '' : ':00'} ${period}`;
}

function formatCardTime(value: string): string {
  const date = new Date(toSydneyDateTimeValue(value));
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
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
function daySegments(bookings: Booking[], selectedDate: Date, rowHeight: number): BookingSegment[] {
  const dayStart = new Date(selectedDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart.getTime() + 24 * 3_600_000);

  const segments: BookingSegment[] = [];
  for (const b of bookings) {
    if (b.status === 'cancelled' || b.status === 'expired') continue;
    const s = pickerDateFromSydneyValue(b.starts_at);
    const e = pickerDateFromSydneyValue(b.ends_at);
    if (e <= dayStart || s >= dayEnd) continue;

    const clippedStart = s < dayStart ? dayStart : s;
    const clippedEnd = e > dayEnd ? dayEnd : e;
    const startHour = (clippedStart.getTime() - dayStart.getTime()) / 3_600_000;
    const endHour = (clippedEnd.getTime() - dayStart.getTime()) / 3_600_000;

    segments.push({
      booking: b,
      top: startHour * rowHeight,
      height: Math.max((endHour - startHour) * rowHeight, rowHeight),
      status: b.status === 'fulfilled' ? 'occupied' : 'booked',
    });
  }
  return segments;
}

/** Time range, driver, plate, tenant — in priority order, trimmed to whatever fits the block's height. */
function bookingLines(booking: Booking): string[] {
  const lines = [
    `${formatTime(toSydneyDateTimeValue(booking.starts_at))}–${formatTime(toSydneyDateTimeValue(booking.ends_at))}`,
    booking.driver?.full_name || undefined,
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
    <View
      style={[
        styles.colHead,
        {
          width: colW,
          borderRightColor: theme.borderStrong,
        },
      ]}>
      <Text variant="label" numberOfLines={1}>{group.space_code}</Text>
    </View>
  );
}

function bookingColors(booking: Booking, scheme: 'light' | 'dark') {
  const palette = BookingCalendarColors[scheme];
  return palette[(booking.id - 1) % palette.length];
}

/**
 * A booked or occupied slot rendered as one inset card spanning its full
 * duration — translucent tint (hour gridlines still read through), a
 * colored left accent bar, and as many detail lines as the height fits.
 */
function BookingBlock({ segment, colW, phone, selected, spaceStatus, onPress }: { segment: BookingSegment; colW: number; phone?: boolean; selected?: boolean; spaceStatus: SpaceStatus; onPress: () => void }) {
  const theme = useTheme();
  const scheme = useScheme();
  const { booking, top, height, status } = segment;
  const isOccupied = status === 'occupied';
  const eventColors = bookingColors(booking, scheme);
  const accent = phone ? eventColors.accent : isOccupied ? theme.danger : theme.warning;
  const fill = phone ? eventColors.fill : isOccupied ? theme.dangerSoft : theme.warningSoft;
  const lines = bookingLines(booking);
  const maxLines = Math.max(1, Math.floor((height - BLOCK_V_PADDING * 2) / BLOCK_LINE_H));
  const visibleLines = lines.slice(0, maxLines);
  const bookingMeta = statusMeta(booking.status);
  const displayStatus = booking.status === 'fulfilled'
    ? { label: spaceStatus === 'occupied' ? 'On site' : 'Complete', tone: spaceStatus === 'occupied' ? 'success' as const : 'neutral' as const }
    : bookingMeta;
  const driverDetails = [booking.driver?.full_name, booking.driver?.phone].filter(Boolean).join(' · ');

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
          borderLeftWidth: phone ? 0 : 3,
          borderLeftColor: accent,
          borderWidth: selected ? 2 : StyleSheet.hairlineWidth,
          borderColor: phone ? eventColors.border : accent,
          paddingHorizontal: phone ? Spacing.md : 6,
          paddingVertical: phone ? Spacing.sm : BLOCK_V_PADDING,
          justifyContent: phone ? 'flex-start' : 'center',
        },
      ]}>
      {phone ? (
        <View style={styles.phoneBlockContent}>
          <View style={styles.phoneBlockTitle}>
            <View style={[styles.eventDot, { backgroundColor: accent }]} />
            <Text variant="label" numberOfLines={1} style={styles.phoneBlockPlate}>{formatPlate(booking.plate_number_raw)}</Text>
            <View style={[styles.phoneStatus, { backgroundColor: eventColors.accent }]}>
              <Text variant="caption" tint="#FFFFFF" numberOfLines={1} style={styles.phoneStatusText}>
                {displayStatus.label}
              </Text>
            </View>
          </View>
          <Text variant="caption" color="textSecondary" numberOfLines={1} style={styles.phoneBlockMeta}>
            {driverDetails || 'Unassigned driver'}
          </Text>
          <Text variant="caption" color="textSecondary" numberOfLines={1} style={styles.phoneBlockMeta}>
            {formatCardTime(booking.starts_at)} – {formatCardTime(booking.ends_at)}
          </Text>
        </View>
      ) : visibleLines.map((line, i) => (
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
  rowHeight = ROW_H,
  phone = false,
  selectedBookingId,
  onPressBooking,
}: {
  group: BookingsBySpaceGroup;
  colW: number;
  selectedDate: Date;
  isToday: boolean;
  nowHour: number;
  rowHeight?: number;
  phone?: boolean;
  selectedBookingId?: number;
  onPressBooking: (booking: Booking) => void;
}) {
  const theme = useTheme();
  const segments = useMemo(() => daySegments(group.bookings, selectedDate, rowHeight), [group.bookings, selectedDate, rowHeight]);

  return (
    <View
      style={[
        styles.gridColumn,
        {
          width: colW,
          height: rowHeight * HOURS.length,
          borderRightColor: theme.borderStrong,
        },
      ]}>
      {HOURS.map((h) => (
        <View
          key={h}
          style={[
            styles.gridRowBg,
            {
              height: rowHeight,
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
          phone={phone}
          selected={selectedBookingId === seg.booking.id}
          spaceStatus={group.status}
          onPress={() => onPressBooking(seg.booking)}
        />
      ))}
    </View>
  );
}

function BayTabs({ groups, selectedId, onSelect }: { groups: BookingsBySpaceGroup[]; selectedId?: number; onSelect: (id: number) => void }) {
  const theme = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bayTabsContent} style={[styles.bayTabs, { borderBottomColor: theme.border }]}>
      {groups.map((group) => {
        const selected = group.parking_space_id === selectedId;
        return (
          <TouchableOpacity
            key={group.parking_space_id}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onSelect(group.parking_space_id)}
            style={[
              styles.bayTab,
              {
                backgroundColor: selected ? theme.primary : theme.surfaceAlt,
                borderColor: selected ? theme.primary : theme.border,
              },
            ]}>
            <Text variant="label" tint={selected ? theme.onPrimary : theme.textSecondary} numberOfLines={1}>
              {group.space_code}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

function BookingQuickPreview({
  id,
  onFulfil,
  onDetails,
}: {
  id: number;
  onFulfil: () => void;
  onDetails: () => void;
}) {
  const scheme = useScheme();
  const { can } = usePermissions();
  const { data: booking, isLoading } = useQuery({
    queryKey: ['booking', id],
    queryFn: () => getBooking(id),
  });

  if (isLoading || !booking) {
    return (
      <View style={styles.quickLoading}>
        <Skeleton width="42%" height={26} />
        <Skeleton width="70%" height={16} />
      </View>
    );
  }

  const meta = statusMeta(booking.status);
  const colors = bookingColors(booking, scheme);
  const canFulfil = can('operations.bookings', 'update') &&
    (booking.status === 'pending' || booking.status === 'confirmed');

  return (
    <View style={styles.quickPreview}>
      <View style={styles.quickSummary}>
        <View style={[styles.quickDot, { backgroundColor: colors.accent }]} />
        <View style={styles.quickText}>
          <Text variant="heading" numberOfLines={1}>{formatPlate(booking.plate_number_raw)}</Text>
          <Text variant="body" color="textSecondary" numberOfLines={1}>
            {booking.parking_space?.space_code ?? 'Unassigned bay'} · {formatCardTime(booking.starts_at)} – {formatCardTime(booking.ends_at)}
          </Text>
        </View>
        <Badge label={meta.label} tone={meta.tone} size="sm" />
      </View>
      <View style={styles.quickActions}>
        {canFulfil ? (
          <Button title="Fulfil" icon="carIn" onPress={onFulfil} style={styles.quickAction} />
        ) : null}
        <Button
          title="View details"
          iconRight="chevronRight"
          variant={canFulfil ? 'secondary' : 'primary'}
          onPress={onDetails}
          style={styles.quickAction}
        />
      </View>
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
      <LegendItem color={theme.danger} label="Occupied" />
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────
export default function BookingsScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const theme = useTheme();
  const scheme = useScheme();
  const { can } = usePermissions();
  const { isTablet, isPhone } = useResponsive();
  const { selectedBuilding } = useSession();
  const { width: screenWidth } = useWindowDimensions();
  const vScrollRef = useRef<ScrollView>(null);
  const headerHRef = useRef<ScrollView>(null);
  const bodyHRef = useRef<ScrollView>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [areaId, setAreaId] = useState<number | null>(null);
  const [showFilter, setShowFilter] = useState(false);
  const hasFilters = search !== '' || status !== '' || areaId !== null;
  const [selectedDate, setSelectedDate] = useState(sydneyNowPickerDate);
  const [iosDateOpen, setIosDateOpen] = useState(false);
  const [draftDate, setDraftDate] = useState(selectedDate);
  const [selectedSpaceId, setSelectedSpaceId] = useState<number>();
  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);
  const [fulfilBookingId, setFulfilBookingId] = useState<number | null>(null);
  const [pendingBookingAction, setPendingBookingAction] = useState<{
    type: 'fulfil' | 'details';
    id: number;
  } | null>(null);
  const debounced = useDebouncedValue(search);
  const dateStr = toISODate(selectedDate);
  const isToday = dateStr === toISODate(sydneyNowPickerDate());
  const nowHour = sydneyNowPickerDate().getHours();

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
    enabled: viewMode === 'cards',
  });

  const bookingList = usePaginatedList(
    ['bookings-list', selectedBuilding?.id],
    listBookings,
    {
      search: debounced || undefined,
      status: status || undefined,
      building_id: selectedBuilding?.id,
      parking_area_id: areaId || undefined,
      date_from: dateStr,
      date_to: dateStr,
    },
    { enabled: viewMode === 'table' },
  );

  const sortedGroups = [...groups].sort((a, b) =>
    a.space_code.localeCompare(b.space_code, undefined, { numeric: true, sensitivity: 'base' }),
  );
  const activeSpaceId = sortedGroups.some((group) => group.parking_space_id === selectedSpaceId)
    ? selectedSpaceId
    : sortedGroups[0]?.parking_space_id;
  const selectedGroup = sortedGroups.find((group) => group.parking_space_id === activeSpaceId);
  const count = sortedGroups.length;
  const timeColumnWidth = isPhone ? PHONE_TIME_COL_W : TIME_COL_W;
  const availableW = screenWidth - timeColumnWidth;
  const colW = count > 0 && count * CELL_W < availableW
    ? Math.floor(availableW / count)
    : CELL_W;

  const changeViewMode = (next: ViewMode) => {
    setStatus('');
    setViewMode(next);
  };

  const goToDate = (d: Date) => {
    setSelectedDate(d);
    setSelectedBookingId(null);
    const sydneyNow = sydneyNowPickerDate();
    const isTargetToday = toISODate(d) === toISODate(sydneyNow);
    const offset = isTargetToday
      ? Math.max((sydneyNow.getHours() - 1) * (isPhone ? PHONE_ROW_H : ROW_H), 0)
      : 8 * (isPhone ? PHONE_ROW_H : ROW_H); // 8 AM for other days
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
    const offset = Math.max((sydneyNowPickerDate().getHours() - 1) * (isPhone ? PHONE_ROW_H : ROW_H), 0);
    const t = setTimeout(() => vScrollRef.current?.scrollTo({ y: offset, animated: false }), 150);
    return () => clearTimeout(t);
  }, [isPhone]);

  // Sync horizontal scroll: body → header
  const onBodyScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    headerHRef.current?.scrollTo({ x: e.nativeEvent.contentOffset.x, animated: false });
  };

  return (
    <Screen
      title="Bookings"
      headerRight={
        <View style={styles.headerActions}>
          {isTablet ? (
            <View>
              <IconButton name="filter" accessibilityLabel="Filter bookings" surface onPress={() => setShowFilter(true)} />
              {hasFilters && <View style={[styles.filterDot, { backgroundColor: theme.primary }]} />}
            </View>
          ) : null}
          {can('operations.bookings', 'create') && (
            isTablet ? (
              <Button title="New booking" icon="add" size="sm" onPress={() => router.push('/bookings/create')} />
            ) : null
          )}
        </View>
      }>
      <View style={styles.root}>
        {/* Date navigation */}
        <View style={[styles.dateNav, { borderBottomColor: theme.border }]}>
          {isPhone ? (
            <>
              <View style={styles.phoneDateGroup}>
                <IconButton name="chevronLeft" accessibilityLabel="Previous day" onPress={() => goToDate(addDays(selectedDate, -1))} />
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Choose date"
                  onPress={openDatePicker}
                  style={[styles.dateLabel, styles.dateLabelPhone]}>
                  <Text variant="subtitle" numberOfLines={1}>{formatCompactNavDate(selectedDate)}</Text>
                </TouchableOpacity>
                <IconButton name="chevronRight" accessibilityLabel="Next day" onPress={() => goToDate(addDays(selectedDate, 1))} />
              </View>
              <View style={styles.phoneDateActions}>
                <View>
                  <IconButton name="filter" accessibilityLabel="Filter bookings" surface onPress={() => setShowFilter(true)} />
                  {hasFilters && <View style={[styles.filterDot, { backgroundColor: theme.primary }]} />}
                </View>
                <ViewModeToggle
                  value={viewMode}
                  onChange={changeViewMode}
                  cardsIcon="bookings"
                  tableIcon="listView"
                  cardsLabel="Calendar view"
                  tableLabel="List view"
                />
              </View>
            </>
          ) : (
            <>
              <IconButton name="chevronLeft" accessibilityLabel="Previous day" onPress={() => goToDate(addDays(selectedDate, -1))} />
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Go to today"
                onPress={() => goToDate(sydneyNowPickerDate())}
                style={styles.dateLabel}>
                <Text variant="subtitle" numberOfLines={1}>{formatNavDate(selectedDate)}</Text>
              </TouchableOpacity>
              <IconButton name="chevronRight" accessibilityLabel="Next day" onPress={() => goToDate(addDays(selectedDate, 1))} />
              <IconButton name="bookings" accessibilityLabel="Choose date" onPress={openDatePicker} />
              <ViewModeToggle
                value={viewMode}
                onChange={changeViewMode}
                cardsIcon="bookings"
                tableIcon="listView"
                cardsLabel="Calendar view"
                tableLabel="List view"
              />
            </>
          )}
        </View>

        {viewMode === 'cards' ? (
          <>
            {isTablet ? <Legend /> : null}

            {isError ? (
              <Banner title="Couldn’t load bookings" message={error?.message} tone="danger" actionLabel="Retry" onAction={refetch} />
            ) : null}

            {isPhone ? (
              <BayTabs
                groups={sortedGroups}
                selectedId={activeSpaceId}
                onSelect={(id) => {
                  setSelectedSpaceId(id);
                  setSelectedBookingId(null);
                }}
              />
            ) : (
              /* Fixed column headers — one per parking space, scrolls horizontally in sync */
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
            )}

            {/* Time grid — vertical scroll */}
            <ScrollView
              ref={vScrollRef}
              style={styles.scroll}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.primary} />
              }>
              <View style={{ flexDirection: 'row', paddingVertical: isPhone ? Spacing.sm : 0 }}>
                {/* Fixed time labels column */}
                <View style={[styles.timeline, { width: timeColumnWidth, borderRightColor: theme.borderStrong, backgroundColor: theme.surfaceAlt }]}>
                  {HOURS.map((h) => (
                    <View
                      key={h}
                      style={[
                        styles.timeCell,
                        {
                          height: isPhone ? PHONE_ROW_H : ROW_H,
                          backgroundColor: isToday && h === nowHour ? theme.primarySoft : 'transparent',
                          justifyContent: isPhone ? 'flex-start' : 'center',
                        },
                      ]}>
                      <Text
                        variant="caption"
                        color="textSecondary"
                        style={isPhone ? styles.phoneTimeLabel : undefined}>
                        {fullHourLabel(h, isPhone)}
                      </Text>
                    </View>
                  ))}
                </View>

                {isPhone ? (
                  <View style={{ width: availableW }}>
                    {selectedGroup ? (
                      <GridColumn
                        key={selectedGroup.parking_space_id}
                        group={selectedGroup}
                        colW={availableW}
                        selectedDate={selectedDate}
                        isToday={isToday}
                        nowHour={nowHour}
                        rowHeight={PHONE_ROW_H}
                        phone
                        selectedBookingId={selectedBookingId ?? undefined}
                        onPressBooking={(booking) => setSelectedBookingId(booking.id)}
                      />
                    ) : null}
                  </View>
                ) : (
                  /* Space columns — horizontal scroll synced with header */
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
                )}
              </View>
            </ScrollView>
          </>
        ) : (
          <ResponsiveListDetail
            items={bookingList.items}
            getId={(booking) => booking.id}
            loading={bookingList.isLoading}
            errorMessage={bookingList.isError ? bookingList.error?.message : undefined}
            onRetry={bookingList.refetch}
            refreshing={bookingList.isRefetching}
            onRefresh={bookingList.refetch}
            onEndReached={() => bookingList.hasNextPage && bookingList.fetchNextPage()}
            loadingMore={bookingList.isFetchingNextPage}
            emptyTitle="No bookings found"
            emptyDescription={debounced || status ? 'Try adjusting your filters.' : 'Bookings for this day will appear here.'}
            onOpen={(id) => isPhone ? setSelectedBookingId(id) : router.push(`/bookings/${id}`)}
            renderDetail={(id) => (
              <BookingDetail key={id} id={id} onChanged={() => void bookingList.refetch()} />
            )}
            renderRow={(booking, { selected, onPress }) => {
              const meta = statusMeta(booking.status);
              const space = booking.parking_space?.space_code ?? 'Unassigned bay';
              const driverOrTenant = booking.driver?.full_name ?? booking.tenant?.name;

              return (
                <ListRow
                  title={formatPlate(booking.plate_number_raw)}
                  subtitle={`${formatTime(toSydneyDateTimeValue(booking.starts_at))}–${formatTime(toSydneyDateTimeValue(booking.ends_at))} · ${space}`}
                  meta={driverOrTenant ?? undefined}
                  selected={selected}
                  onPress={onPress}
                  leading={
                    <View style={[styles.listIcon, { backgroundColor: theme.primarySoft }]}>
                      <Icon name="bookings" size={20} color={theme.primary} />
                    </View>
                  }
                  trailing={
                    <View style={styles.listTrail}>
                      <Badge label={meta.label} tone={meta.tone} size="sm" dot />
                      <Text variant="caption" color="textMuted">
                        {booking.booking_no}
                      </Text>
                    </View>
                  }
                />
              );
            }}
          />
        )}
      </View>

      <FilterSheet visible={showFilter} onClose={() => setShowFilter(false)} title="Filter bookings">
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search plate, ref, driver…" />
        <Select value={areaId ?? 0} options={areaOptions} onChange={(v) => setAreaId((v as number) || null)} placeholder="All areas" />
        <Segmented
          scrollable
          options={(viewMode === 'cards' ? BOARD_FILTERS : LIST_FILTERS) as never}
          value={status}
          onChange={setStatus}
        />
      </FilterSheet>

      <FilterSheet
        visible={isPhone && selectedBookingId !== null}
        onClose={() => setSelectedBookingId(null)}
        onClosed={() => {
          if (!pendingBookingAction) return;
          if (pendingBookingAction.type === 'fulfil') {
            setFulfilBookingId(pendingBookingAction.id);
          } else {
            router.push(`/bookings/${pendingBookingAction.id}`);
          }
          setPendingBookingAction(null);
        }}
        title="Booking"
        scrollable={false}
        contentStyle={styles.quickDrawerBody}>
        {selectedBookingId !== null ? (
          <BookingQuickPreview
            id={selectedBookingId}
            onFulfil={() => {
              setPendingBookingAction({ type: 'fulfil', id: selectedBookingId });
              setSelectedBookingId(null);
            }}
            onDetails={() => {
              setPendingBookingAction({ type: 'details', id: selectedBookingId });
              setSelectedBookingId(null);
            }}
          />
        ) : null}
      </FilterSheet>

      {fulfilBookingId !== null ? (
        <FulfilModal
          visible
          bookingId={fulfilBookingId}
          onClose={() => setFulfilBookingId(null)}
          onDone={() => {
            void qc.invalidateQueries({ queryKey: ['booking', fulfilBookingId] });
            void qc.invalidateQueries({ queryKey: ['bookings'] });
            void qc.invalidateQueries({ queryKey: ['bookings-by-space'] });
            void qc.invalidateQueries({ queryKey: ['bookings-list'] });
            void qc.invalidateQueries({ queryKey: ['transactions'] });
            void qc.invalidateQueries({ queryKey: ['active-vehicles'] });
            void qc.invalidateQueries({ queryKey: ['transaction-scope-count'] });
            void qc.invalidateQueries({ queryKey: ['dashboard'] });
            setFulfilBookingId(null);
          }}
        />
      ) : null}

      {Platform.OS === 'ios' ? (
        <PickerSheetModal visible={iosDateOpen} onClose={() => setIosDateOpen(false)}>
          {(dismiss) => (
            <>
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
                  dismiss();
                }}
                fullWidth
              />
            </>
          )}
        </PickerSheetModal>
      ) : null}

      {isPhone && can('operations.bookings', 'create') ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="New booking"
          onPress={() => router.push('/bookings/create')}
          style={({ pressed }) => [
            styles.bookingFab,
            { backgroundColor: theme.primary },
            Shadow.md as object,
            pressed && styles.bookingFabPressed,
          ]}>
          <Icon name="add" size={26} color={theme.onPrimary} />
        </Pressable>
      ) : null}
    </Screen>
  );
}

// ── Styles ────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },

  // Header actions row (filter + add)
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  listIcon: { width: 44, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  listTrail: { alignItems: 'flex-end', gap: Spacing.xs },
  filterDot: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  bookingFab: {
    position: 'absolute',
    right: Spacing.lg,
    bottom: Spacing.lg,
    width: 56,
    height: 56,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  bookingFabPressed: { opacity: 0.8, transform: [{ scale: 0.96 }] },

  // Date navigation
  dateNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dateLabel: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 2,
  },
  dateLabelPhone: { flex: 0, width: 148 },
  phoneDateGroup: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  phoneDateActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },

  // Phone bay selector
  bayTabs: {
    flexGrow: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  bayTabsContent: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  bayTab: {
    minWidth: 82,
    minHeight: 42,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
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
    gap: 5,
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
  phoneTimeLabel: { transform: [{ translateY: -8 }] },

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
  },
  blockLine: {
    fontSize: 9,
    lineHeight: BLOCK_LINE_H,
  },
  phoneBlockTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  phoneBlockContent: { gap: 1 },
  phoneBlockPlate: { flex: 1, minWidth: 0, fontSize: 15, lineHeight: 18 },
  phoneStatus: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: Radius.pill },
  phoneStatusText: { fontWeight: '600' },
  eventDot: { width: 10, height: 10, borderRadius: Radius.pill },
  phoneBlockMeta: { marginLeft: 18, lineHeight: 14 },

  quickDrawerBody: { paddingTop: Spacing.sm },
  quickLoading: { gap: Spacing.sm, paddingVertical: Spacing.lg },
  quickPreview: { gap: Spacing.lg },
  quickSummary: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  quickDot: { width: 18, height: 18, borderRadius: Radius.pill },
  quickText: { flex: 1, minWidth: 0, gap: 2 },
  quickActions: { flexDirection: 'row', gap: Spacing.sm },
  quickAction: { flex: 1 },

  picker: { width: '100%', maxWidth: 320, height: 216, alignSelf: 'center' },
});

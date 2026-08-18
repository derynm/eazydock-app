import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { fetchDashboard } from '@/api/dashboard';
import { lookupParkingAreas } from '@/api/lookups';
import type { DashboardActiveVehicle } from '@/api/types';
import { useActiveCompany, useSession } from '@/auth/session';
import { Screen } from '@/components/screen';
import { Banner, Card, Divider, Icon, Select, Skeleton, Text, type IconName } from '@/components/ui';
import { Layout, Radius, Shadow, Spacing } from '@/constants/theme';
import { DashboardChartCarousel } from '@/features/dashboard/dashboard-chart-carousel';
import { usePermissions } from '@/hooks/use-permissions';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { formatDuration, formatPlate, titleCase } from '@/lib/format';

function accentDataUri(color: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 18" preserveAspectRatio="none"><path d="M0 0 C4 11 12 14 24 14 H76 C88 14 96 11 100 0 V18 H0 Z" fill="${color}"/></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export default function Dashboard() {
  const theme = useTheme();
  const router = useRouter();
  const company = useActiveCompany();
  const { activeCompanyId, selectedBuilding } = useSession();
  const { can } = usePermissions();
  const { width, isTablet } = useResponsive();
  const buildingId = selectedBuilding?.id;
  const [parkingAreaFilter, setParkingAreaFilter] = useState<{
    companyId: number | null;
    buildingId: number | undefined;
    areaId: number | null;
  }>({ companyId: activeCompanyId, buildingId, areaId: null });
  const parkingAreaId = parkingAreaFilter.companyId === activeCompanyId &&
    parkingAreaFilter.buildingId === buildingId
    ? parkingAreaFilter.areaId
    : null;

  const { data: parkingAreas = [] } = useQuery({
    queryKey: ['lookup-areas', buildingId],
    queryFn: () => lookupParkingAreas(buildingId),
    enabled: activeCompanyId !== null && buildingId !== undefined,
  });
  const parkingAreaOptions = [
    { label: 'All parking areas', value: 0 },
    ...parkingAreas.map((area) => ({ label: area.name, value: area.id })),
  ];

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['dashboard', activeCompanyId, buildingId, parkingAreaId],
    queryFn: () =>
      fetchDashboard({
        building_id: buildingId,
        parking_area_id: parkingAreaId ?? undefined,
      }),
    enabled: activeCompanyId !== null,
  });

  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  const contextName = selectedBuilding?.name ?? company?.name;
  const subtitle = contextName
    ? contextName.toLowerCase().endsWith('admin')
      ? contextName
      : `${contextName} Admin`
    : undefined;
  const metrics = data?.metrics;

  return (
    <Screen
      title="Dashboard"
      subtitle={subtitle}
      compactHeader
      headerRight={
        <Select
          label="Parking area"
          value={parkingAreaId ?? 0}
          options={parkingAreaOptions}
          onChange={(value) => setParkingAreaFilter({
            companyId: activeCompanyId,
            buildingId,
            areaId: value || null,
          })}
          placeholder="All parking areas"
          trigger={(open, selected) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Filter parking area. ${selected?.label ?? 'All parking areas'}`}
              onPress={open}
              style={({ pressed }) => [
                styles.headerFilter,
                {
                  borderColor: theme.border,
                  backgroundColor: pressed ? theme.surfaceSunken : theme.surface,
                },
                isTablet && styles.headerFilterTablet,
                pressed && styles.headerFilterPressed,
              ]}>
              <Icon
                name="filter"
                size={isTablet ? 18 : 16}
                color={parkingAreaId ? theme.primary : theme.textSecondary}
              />
            </Pressable>
          )}
        />
      }>
      <ScrollView
        contentContainerStyle={[styles.content, !isTablet && styles.contentPhone]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }>
        {isError && !data ? (
          <Banner
            title="Couldn’t load dashboard"
            message={error?.message}
            tone="danger"
            actionLabel="Retry"
            onAction={refetch}
          />
        ) : null}

        {isLoading && !data ? (
          <DashboardLoading />
        ) : data && metrics ? (
          <>
            <View style={[styles.kpiRow, !isTablet && styles.kpiRowCompact]}>
              <DashboardKpi
                icon="transactions"
                value={metrics.currently_inside}
                label="Currently inside"
                hint={`${metrics.currently_inside} vehicles`}
                color={theme.primary}
                softColor={theme.primarySoft}
                compact={!isTablet}
                weight={1.14}
              />
              <DashboardKpi
                icon="occupancy"
                value={`${metrics.occupancy_percentage}%`}
                label="Occupancy"
                hint={`${metrics.occupied_spaces} of ${metrics.total_spaces} bays`}
                color={theme.success}
                softColor={theme.successSoft}
                compact={!isTablet}
                weight={1.07}
              />
              <DashboardKpi
                icon="clock"
                value={metrics.available_spaces}
                label="Available bays"
                hint={`${metrics.occupied_spaces} in use`}
                color={theme.accent}
                softColor={theme.accentSoft}
                compact={!isTablet}
                weight={0.94}
              />
            </View>

            <Card
              style={[
                styles.dashboardCard,
                styles.sectionCard,
                !isTablet && styles.sectionCardPhone,
                Shadow.xs as object,
              ]}>
              <DashboardChartCarousel
                metrics={metrics}
                dailyParkingHours={data.current_week_parking_hours?.daily ?? []}
                dailyMovement={data.daily_movement_trend ?? []}
                ringSize={isTablet ? 184 : width < 380 ? 120 : 130}
              />
            </Card>

            <Card
              style={[
                styles.dashboardCard,
                styles.sectionCard,
                !isTablet && styles.sectionCardPhone,
                Shadow.xs as object,
              ]}>
              <Text variant="overline" color="textSecondary" style={styles.sectionTitle}>
                Quick actions
              </Text>
              <View style={styles.quickActions}>
                {can('operations.transactions', 'create') ? (
                  <QuickAction
                    icon="arrowDownRight"
                    title="New check-in"
                    color={theme.primary}
                    softColor={theme.primarySoft}
                    onPress={() => router.push('/transactions/check-in')}
                    compact={!isTablet}
                  />
                ) : null}
                {can('operations.bookings', 'create') ? (
                  <QuickAction
                    icon="bookings"
                    title="New booking"
                    color={theme.success}
                    softColor={theme.successSoft}
                    onPress={() => router.push('/bookings/create')}
                    compact={!isTablet}
                  />
                ) : null}
                {can('operations.incidents', 'view') ? (
                  <QuickAction
                    icon="incident"
                    title="Incidents"
                    color={theme.danger}
                    softColor={theme.dangerSoft}
                    onPress={() => router.push('/incidents')}
                    compact={!isTablet}
                  />
                ) : null}
              </View>
            </Card>

            <OnSitePanel
              vehicles={data.active_vehicles}
              total={metrics.currently_inside}
              onSeeAll={() => router.push('/transactions')}
              onOpen={(id) => router.push(`/transactions/${id}`)}
              compact={!isTablet}
            />
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function DashboardKpi({
  icon,
  value,
  label,
  hint,
  breakdown,
  color,
  softColor,
  compact,
  weight,
}: {
  icon: IconName;
  value: string | number;
  label: string;
  hint?: string;
  breakdown?: { label: string; icon: IconName; value: number }[];
  color: string;
  softColor: string;
  compact: boolean;
  weight: number;
}) {
  const theme = useTheme();
  const detailLabel = breakdown
    ? breakdown.map((item) => `${item.value} ${item.label}`).join(', ')
    : hint;

  return (
    <Card
      accessibilityLabel={`${label}: ${value}.${detailLabel ? ` ${detailLabel}` : ''}`}
      style={[
        styles.dashboardCard,
        styles.kpiCard,
        compact && styles.kpiCardCompact,
        { flex: compact ? 1 : weight },
        Shadow.xs as object,
      ]}>
      <View style={styles.kpiHeading}>
        <View
          style={[
            styles.kpiIcon,
            compact && styles.kpiIconCompact,
            { backgroundColor: softColor },
          ]}>
          <Icon name={icon} size={compact ? 19 : 23} color={color} />
        </View>
        <Text
          variant="display"
          style={[styles.kpiValue, compact && styles.kpiValueCompact]}
          numberOfLines={1}>
          {value}
        </Text>
      </View>
      <View style={styles.kpiDetails}>
        <Text
          variant="label"
          style={[styles.kpiLabel, compact && styles.kpiLabelCompact]}
          numberOfLines={1}>
          {label}
        </Text>
        {breakdown ? (
          <View style={[styles.kpiBreakdown, compact && styles.kpiBreakdownCompact]}>
            {breakdown.map((item) => (
              <View
                key={item.label}
                accessible={false}
                style={[styles.kpiBreakdownItem, compact && styles.kpiBreakdownItemCompact]}>
                <Icon
                  name={item.icon}
                  size={compact ? 11 : 13}
                  color={theme.textSecondary}
                />
                <Text
                  variant="caption"
                  color="textSecondary"
                  style={compact && styles.kpiBreakdownValueCompact}>
                  {item.value}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text
            variant="caption"
            color="textSecondary"
            style={compact && styles.kpiHintCompact}
            numberOfLines={compact ? 2 : 1}>
            {hint}
          </Text>
        )}
      </View>
      <Image
        pointerEvents="none"
        source={{ uri: accentDataUri(softColor) }}
        contentFit="fill"
        cachePolicy="none"
        style={styles.kpiAccent}
      />
    </Card>
  );
}

function QuickAction({
  icon,
  title,
  color,
  softColor,
  onPress,
  compact,
}: {
  icon: IconName;
  title: string;
  color: string;
  softColor: string;
  onPress: () => void;
  compact: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [
        styles.quickAction,
        compact && styles.quickActionCompact,
        { borderColor: theme.border, backgroundColor: pressed ? theme.surfaceSunken : theme.surface },
      ]}>
      <View
        style={[
          styles.quickIcon,
          compact && styles.quickIconCompact,
          { backgroundColor: softColor },
        ]}>
        <Icon
          name={icon}
          size={compact ? 17 : 22}
          color={color}
          weight="semibold"
        />
      </View>
      <Text
        variant="label"
        style={[styles.quickTitle, compact && styles.quickTitleCompact]}
        numberOfLines={2}>
        {title}
      </Text>
    </Pressable>
  );
}

function OnSitePanel({
  vehicles,
  total,
  onSeeAll,
  onOpen,
  compact,
}: {
  vehicles: DashboardActiveVehicle[];
  total: number;
  onSeeAll: () => void;
  onOpen: (id: number) => void;
  compact: boolean;
}) {
  const theme = useTheme();
  return (
    <Card padded={false} style={[styles.dashboardCard, Shadow.xs as object]}>
      <View style={[styles.onSiteHeader, compact && styles.onSiteHeaderCompact]}>
        <Text
          variant="overline"
          color="textSecondary"
          style={[styles.sectionTitle, compact && styles.onSiteTitleCompact]}>
          On site now · {total}
        </Text>
        <Pressable accessibilityRole="button" onPress={onSeeAll} hitSlop={8}>
          <Text variant="label" tint={theme.primary}>
            See all
          </Text>
        </Pressable>
      </View>
      <Divider />

      {vehicles.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={[styles.emptyIcon, { backgroundColor: theme.successSoft }]}>
            <Icon name="checkCircle" size={24} color={theme.success} />
          </View>
          <Text variant="body" color="textSecondary">
            {total === 0
              ? 'No vehicles currently on site.'
              : 'Vehicle preview is unavailable. Tap See all to view current activity.'}
          </Text>
        </View>
      ) : (
        vehicles.slice(0, 6).map((vehicle, index) => (
          <View key={vehicle.id}>
            {index > 0 ? <Divider inset={Spacing.lg} /> : null}
            <OnSiteRow vehicle={vehicle} onPress={() => onOpen(vehicle.id)} compact={compact} />
          </View>
        ))
      )}
    </Card>
  );
}

function OnSiteRow({
  vehicle,
  onPress,
  compact,
}: {
  vehicle: DashboardActiveVehicle;
  onPress: () => void;
  compact: boolean;
}) {
  const theme = useTheme();
  const isOverstay = vehicle.is_overstay;
  const statusLabel = isOverstay ? 'Overstay' : vehicle.status === 'active' ? 'Parked' : titleCase(vehicle.status);
  const duration =
    vehicle.parked_duration_label || formatDuration(vehicle.parked_duration_minutes);
  const plate = formatPlate(vehicle.vehicle?.plate_number) || 'Unknown plate';
  const bay = vehicle.parking_space?.space_code ?? vehicle.parking_area?.name ?? 'Unassigned bay';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${plate}, ${bay}, ${statusLabel}, ${duration}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.onSiteRow,
        compact && styles.onSiteRowCompact,
        pressed && { backgroundColor: theme.surfaceSunken },
      ]}>
      <View
        style={[
          styles.vehicleIcon,
          compact && styles.vehicleIconCompact,
          { backgroundColor: theme.primarySoft },
        ]}>
        <Icon name="transactions" size={compact ? 21 : 23} color={theme.primary} />
      </View>
      <View style={styles.vehicleIdentity}>
        <Text
          variant="subtitle"
          style={compact && styles.vehiclePlateCompact}
          numberOfLines={1}>
          {plate}
        </Text>
        <View style={styles.bayLine}>
          <View style={[styles.bayDot, { backgroundColor: theme.primary }]} />
          <Text
            variant="caption"
            color="textSecondary"
            style={compact && styles.vehicleBayCompact}
            numberOfLines={1}>
            {bay}
          </Text>
        </View>
      </View>
      <View style={[styles.vehicleStatus, compact && styles.vehicleStatusCompact]}>
        <View
          style={[
            styles.statusBadge,
            compact && styles.statusBadgeCompact,
            { backgroundColor: isOverstay ? theme.warningSoft : theme.successSoft },
          ]}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: isOverstay ? theme.warning : theme.success },
            ]}
          />
          <Text
            variant="caption"
            tint={isOverstay ? theme.warning : theme.success}
            style={compact && styles.statusTextCompact}>
            {statusLabel}
          </Text>
        </View>
        <Text
          variant="caption"
          color="textMuted"
          style={compact && styles.durationCompact}
          numberOfLines={1}>
          {duration}
        </Text>
      </View>
      <Icon name="chevronRight" size={compact ? 16 : 18} color={theme.text} />
    </Pressable>
  );
}

function DashboardLoading() {
  return (
    <>
      <View style={[styles.kpiRow, styles.kpiRowCompact]}>
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index} style={[styles.kpiCard, styles.kpiCardCompact]}>
            <View style={styles.kpiHeading}>
              <Skeleton width="55%" height={30} />
              <Skeleton width={34} height={34} radius={Radius.md} />
            </View>
            <View style={styles.kpiDetails}>
              <Skeleton width="85%" height={14} />
              <Skeleton width="70%" height={11} />
            </View>
          </Card>
        ))}
      </View>
      <Card style={styles.loadingPanel}>
        <Skeleton width="28%" height={12} />
        <Skeleton height={170} />
      </Card>
      <Card style={styles.loadingPanel}>
        <Skeleton width="32%" height={12} />
        <Skeleton height={132} />
      </Card>
      <Card style={styles.loadingPanel}>
        <Skeleton width="36%" height={12} />
        <Skeleton height={72} />
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    maxWidth: Layout.maxContentWidth,
    alignSelf: 'center',
    padding: Spacing.xl,
    gap: Spacing.xl,
  },
  contentPhone: { padding: Spacing.lg, gap: Spacing.md },
  headerFilter: {
    width: 36,
    height: 36,
    borderWidth: 1,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerFilterTablet: { width: 40, height: 40 },
  headerFilterPressed: { opacity: 0.7 },
  dashboardCard: { borderWidth: 1 },
  kpiRow: { flexDirection: 'row', alignItems: 'stretch', gap: Spacing.sm },
  kpiRowCompact: { gap: 6 },
  kpiCard: {
    flex: 1,
    minWidth: 0,
    minHeight: 174,
    gap: Spacing.xs,
    paddingBottom: Spacing.xl,
  },
  kpiCardCompact: {
    minHeight: 136,
    justifyContent: 'flex-start',
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 18,
  },
  kpiHeading: {
    width: '100%',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  kpiDetails: { width: '100%', gap: Spacing.xs },
  kpiIcon: {
    width: 46,
    height: 46,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  kpiIconCompact: { width: 34, height: 34 },
  kpiValue: { width: '100%', flexShrink: 0, fontSize: 36, lineHeight: 40 },
  kpiValueCompact: { fontSize: 24, lineHeight: 28 },
  kpiLabel: { fontSize: 15, lineHeight: 19 },
  kpiLabelCompact: { fontSize: 11, lineHeight: 15 },
  kpiHintCompact: { minHeight: 16, marginTop: 0 },
  kpiBreakdown: {
    minHeight: 32,
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.xs,
  },
  kpiBreakdownCompact: { gap: 1 },
  kpiBreakdownItem: {
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    flexShrink: 1,
  },
  kpiBreakdownItemCompact: { gap: 1 },
  kpiBreakdownValueCompact: { fontSize: 10, lineHeight: 12 },
  kpiAccent: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 18,
    borderBottomLeftRadius: Radius.lg,
    borderBottomRightRadius: Radius.lg,
  },
  sectionCard: { padding: Spacing.xl, gap: Spacing.xl },
  sectionCardPhone: { padding: Spacing.lg, gap: Spacing.md },
  sectionTitle: { fontSize: 12, lineHeight: 16, letterSpacing: 0.9 },
  quickActions: { flexDirection: 'row', alignItems: 'stretch', gap: Spacing.sm },
  quickAction: {
    flex: 1,
    minWidth: 0,
    minHeight: 146,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionCompact: { minHeight: 80, borderRadius: Radius.md, padding: Spacing.sm, gap: 6 },
  quickIcon: {
    width: 42,
    height: 42,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickIconCompact: { width: 34, height: 34 },
  quickTitle: { textAlign: 'center' },
  quickTitleCompact: { fontSize: 12, lineHeight: 16 },
  onSiteHeader: {
    minHeight: 58,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  onSiteHeaderCompact: { minHeight: 44 },
  onSiteTitleCompact: { fontSize: 11, lineHeight: 14 },
  onSiteRow: {
    minHeight: 92,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  onSiteRowCompact: { minHeight: 66, paddingVertical: Spacing.sm, gap: Spacing.sm },
  vehicleIcon: {
    width: 52,
    height: 52,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  vehicleIconCompact: { width: 44, height: 44 },
  vehicleIdentity: { flex: 1, minWidth: 0, gap: 5 },
  vehiclePlateCompact: { fontSize: 16, lineHeight: 21 },
  vehicleBayCompact: { fontSize: 11, lineHeight: 15 },
  bayLine: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  bayDot: { width: 6, height: 6, borderRadius: Radius.pill },
  vehicleStatus: { alignItems: 'flex-end', gap: 5, flexShrink: 0 },
  vehicleStatusCompact: { alignItems: 'center' },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  statusBadgeCompact: { paddingVertical: 2 },
  statusTextCompact: { fontSize: 11, lineHeight: 14 },
  durationCompact: { fontSize: 11, lineHeight: 15 },
  statusDot: { width: 7, height: 7, borderRadius: Radius.pill },
  emptyState: { minHeight: 128, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  emptyIcon: { width: 48, height: 48, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  loadingPanel: { gap: Spacing.lg },
});

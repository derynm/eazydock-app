import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { fetchDashboard } from '@/api/dashboard';
import type { DashboardActiveVehicle, DashboardOccupancy } from '@/api/types';
import { useActiveCompany, useSession } from '@/auth/session';
import { Screen } from '@/components/screen';
import { Banner, Card, Divider, Icon, Skeleton, Text, type IconName } from '@/components/ui';
import { Layout, Radius, Shadow, Spacing } from '@/constants/theme';
import { usePermissions } from '@/hooks/use-permissions';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { formatDuration, formatPlate, titleCase } from '@/lib/format';

function accentDataUri(color: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 18" preserveAspectRatio="none"><path d="M0 0 C4 11 12 14 24 14 H76 C88 14 96 11 100 0 V18 H0 Z" fill="${color}"/></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
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

export default function Dashboard() {
  const theme = useTheme();
  const router = useRouter();
  const company = useActiveCompany();
  const { user, selectedBuilding } = useSession();
  const { can } = usePermissions();
  const { width, isTablet } = useResponsive();

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['dashboard'],
    queryFn: fetchDashboard,
  });

  const contextName = selectedBuilding?.name ?? company?.name;
  const subtitle = contextName
    ? contextName.toLowerCase().endsWith('admin')
      ? contextName
      : `${contextName} Admin`
    : undefined;
  const metrics = data?.metrics;
  const initials = user?.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  return (
    <Screen
      title="Dashboard"
      subtitle={subtitle}
      compactHeader
      headerRight={
        initials ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open profile"
            onPress={() => router.push('/profile' as never)}
            style={({ pressed }) => [
              styles.headerAvatar,
              { backgroundColor: theme.primarySoft },
              isTablet && styles.headerAvatarTablet,
              pressed && styles.headerAvatarPressed,
            ]}>
            <Text variant="label" tint={theme.primary}>
              {initials}
            </Text>
          </Pressable>
        ) : undefined
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
            <View style={styles.kpiRow}>
              <DashboardKpi
                icon="transactions"
                value={metrics.currently_inside}
                label="Currently inside"
                hint={`${metrics.visitor_inside} ${metrics.visitor_inside === 1 ? 'visitor' : 'visitors'} · ${metrics.delivery_inside} ${metrics.delivery_inside === 1 ? 'delivery' : 'deliveries'}`}
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

            <OccupancyPanel
              occupancy={data.occupancy}
              ringSize={isTablet ? 184 : width < 380 ? 120 : 130}
              compact={!isTablet}
            />

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
                    description="Record vehicle arrival"
                    color={theme.primary}
                    onPress={() => router.push('/transactions/check-in')}
                    compact={!isTablet}
                  />
                ) : null}
                {can('operations.bookings', 'create') ? (
                  <QuickAction
                    icon="bookings"
                    title="New booking"
                    description="Schedule a loading dock"
                    color={theme.success}
                    onPress={() => router.push('/bookings/create')}
                    compact={!isTablet}
                  />
                ) : null}
                {can('operations.incidents', 'view') ? (
                  <QuickAction
                    icon="incident"
                    title="Incidents"
                    description="Review reported incidents"
                    color={theme.danger}
                    onPress={() => router.push('/incidents')}
                    compact={!isTablet}
                  />
                ) : null}
              </View>
            </Card>

            <OnSitePanel
              vehicles={data.active_vehicles}
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
  color,
  softColor,
  compact,
  weight,
}: {
  icon: IconName;
  value: string | number;
  label: string;
  hint: string;
  color: string;
  softColor: string;
  compact: boolean;
  weight: number;
}) {
  return (
    <Card
      accessibilityLabel={`${label}: ${value}. ${hint}`}
      style={[
        styles.dashboardCard,
        styles.kpiCard,
        compact && styles.kpiCardCompact,
        { flex: weight },
        Shadow.xs as object,
      ]}>
      <View style={[styles.kpiIcon, compact && styles.kpiIconCompact, { backgroundColor: softColor }]}>
        <Icon name={icon} size={compact ? 19 : 23} color={color} />
      </View>
      <Text
        variant="display"
        style={[styles.kpiValue, compact && styles.kpiValueCompact]}
        numberOfLines={1}>
        {value}
      </Text>
      <Text
        variant="label"
        style={[styles.kpiLabel, compact && styles.kpiLabelCompact]}
        numberOfLines={1}>
        {label}
      </Text>
      <Text
        variant="caption"
        color="textSecondary"
        style={compact && styles.kpiHintCompact}
        numberOfLines={compact ? 2 : 1}>
        {hint}
      </Text>
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

function OccupancyPanel({
  occupancy,
  ringSize,
  compact,
}: {
  occupancy: DashboardOccupancy;
  ringSize: number;
  compact: boolean;
}) {
  const theme = useTheme();
  const percentage = Math.min(100, Math.max(0, occupancy.percentage));

  return (
    <Card
      style={[
        styles.dashboardCard,
        styles.sectionCard,
        compact && styles.sectionCardPhone,
        Shadow.xs as object,
      ]}>
      <Text variant="overline" color="textSecondary" style={styles.sectionTitle}>
        Occupancy
      </Text>
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
    </Card>
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
    <View style={styles.legendItem}>
      <View style={styles.legendLabel}>
        <View style={[styles.legendDot, { backgroundColor: color }]} />
        <Text variant="caption" color="textSecondary">
          {label}
        </Text>
      </View>
      <Text variant="caption" color="textMuted" style={styles.legendValue}>
        {value}
      </Text>
    </View>
  );
}

function QuickAction({
  icon,
  title,
  description,
  color,
  onPress,
  compact,
}: {
  icon: IconName;
  title: string;
  description: string;
  color: string;
  onPress: () => void;
  compact: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${description}`}
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
          { backgroundColor: color },
        ]}>
        <Icon
          name={icon}
          size={compact ? 15 : 23}
          color={theme.surface}
          weight="semibold"
        />
      </View>
      <View style={styles.quickText}>
        <Text variant="label" style={compact && styles.quickTitleCompact} numberOfLines={2}>
          {title}
        </Text>
        <Text
          variant="caption"
          color="textSecondary"
          style={compact && styles.quickDescriptionCompact}
          numberOfLines={3}>
          {description}
        </Text>
      </View>
    </Pressable>
  );
}

function OnSitePanel({
  vehicles,
  onSeeAll,
  onOpen,
  compact,
}: {
  vehicles: DashboardActiveVehicle[];
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
          On site now · {vehicles.length}
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
            No vehicles currently on site.
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
  const isOverstay = vehicle.status === 'overstay';
  const statusLabel = vehicle.status === 'active' ? 'Parked' : titleCase(vehicle.status);
  const duration =
    vehicle.parked_duration_label || formatDuration(vehicle.parked_duration_minutes);
  const plate = formatPlate(vehicle.entry_plate_number_raw ?? vehicle.vehicle?.plate_number) || 'Unknown plate';
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
            { backgroundColor: isOverstay ? theme.dangerSoft : theme.successSoft },
          ]}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: isOverstay ? theme.danger : theme.success },
            ]}
          />
          <Text
            variant="caption"
            tint={isOverstay ? theme.danger : theme.success}
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
      <View style={styles.kpiRow}>
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index} style={[styles.kpiCard, styles.kpiCardCompact]}>
            <Skeleton width={36} height={36} radius={Radius.md} />
            <Skeleton width="65%" height={30} />
            <Skeleton width="85%" height={14} />
            <Skeleton width="70%" height={11} />
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
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarTablet: { width: 40, height: 40 },
  headerAvatarPressed: { opacity: 0.7 },
  dashboardCard: { borderWidth: 1 },
  kpiRow: { flexDirection: 'row', alignItems: 'stretch', gap: Spacing.sm },
  kpiCard: {
    flex: 1,
    minWidth: 0,
    minHeight: 174,
    gap: Spacing.xs,
    paddingBottom: Spacing.xl,
  },
  kpiCardCompact: {
    minHeight: 166,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: 20,
  },
  kpiIcon: {
    width: 46,
    height: 46,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  kpiIconCompact: { width: 36, height: 36, marginBottom: 6 },
  kpiValue: { fontSize: 36, lineHeight: 40 },
  kpiValueCompact: { fontSize: 28, lineHeight: 31 },
  kpiLabel: { fontSize: 15, lineHeight: 19 },
  kpiLabelCompact: { fontSize: 12, lineHeight: 16 },
  kpiHintCompact: { minHeight: 32, marginTop: 2 },
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
  occupancyBody: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg },
  occupancyDetails: { flex: 1, minWidth: 0, gap: Spacing.md },
  occupancyHeadline: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'nowrap', gap: 5 },
  occupancyCount: { fontSize: 21, lineHeight: 26 },
  progressTrack: { height: 10, borderRadius: Radius.pill, overflow: 'hidden' },
  progressFill: { height: '100%', minWidth: 5, borderRadius: Radius.pill },
  occupancyLegend: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: Spacing.sm },
  legendItem: { flex: 1, minWidth: 0, gap: 3 },
  legendLabel: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  legendDot: { width: 9, height: 9, borderRadius: Radius.pill },
  legendValue: { paddingLeft: Spacing.lg },
  ring: { position: 'relative', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  ringGraphic: { position: 'absolute', left: 0, top: 0 },
  ringLabel: { alignItems: 'center', gap: 1 },
  ringPercentage: { fontSize: 30, lineHeight: 34 },
  ringPercentageCompact: { fontSize: 26, lineHeight: 30 },
  quickActions: { flexDirection: 'row', alignItems: 'stretch', gap: Spacing.sm },
  quickAction: {
    flex: 1,
    minWidth: 0,
    minHeight: 146,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  quickActionCompact: { minHeight: 100, borderRadius: Radius.md, padding: Spacing.sm, gap: 6 },
  quickIcon: {
    width: 42,
    height: 42,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickIconCompact: { width: 30, height: 30 },
  quickText: { gap: 2 },
  quickTitleCompact: { fontSize: 12, lineHeight: 16 },
  quickDescriptionCompact: { fontSize: 10, lineHeight: 13 },
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

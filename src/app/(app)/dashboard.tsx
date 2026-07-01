import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import { fetchDashboard } from '@/api/dashboard';
import { Screen } from '@/components/screen';
import {
  Badge,
  Banner,
  Button,
  Card,
  Divider,
  Icon,
  ListRow,
  Section,
  Skeleton,
  StatCard,
  Text,
} from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { DashboardChartCarousel } from '@/features/dashboard/dashboard-chart-carousel';
import { useActiveCompany } from '@/auth/session';
import { useResponsive } from '@/hooks/use-responsive';
import { usePermissions } from '@/hooks/use-permissions';
import { useTheme } from '@/hooks/use-theme';
import { formatPlate, durationSince } from '@/lib/format';
import { transactionStatusMeta } from '@/lib/status';

export default function Dashboard() {
  const theme = useTheme();
  const router = useRouter();
  const company = useActiveCompany();
  const { width: screenWidth, isWide, isTablet } = useResponsive();
  const { can } = usePermissions();
  const [gridWidth, setGridWidth] = useState(0);

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['dashboard'],
    queryFn: fetchDashboard,
  });

  const cols = isWide ? 4 : isTablet ? 3 : 2;
  const gridGap = isTablet ? Spacing.md : Spacing.sm;
  const onGridLayout = (e: LayoutChangeEvent) => setGridWidth(e.nativeEvent.layout.width);
  const cardWidth = gridWidth > 0 ? (gridWidth - gridGap * (cols - 1)) / cols : undefined;
  const phoneCardWidth = Math.min(
    170,
    Math.max(148, Math.round((screenWidth - Spacing.xl - Spacing.sm) / 2.15)),
  );

  const m = data?.metrics;
  const today = new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());

  const kpis = m
    ? [
        { label: 'Currently inside', value: m.currently_inside, icon: 'transactions' as const, tone: 'primary' as const, hint: `${m.visitor_inside} visitors · ${m.delivery_inside} deliveries` },
        { label: 'Occupancy', value: `${m.occupancy_percentage}%`, icon: 'occupancy' as const, tone: m.occupancy_percentage > 85 ? ('danger' as const) : ('success' as const), hint: `${m.occupied_spaces}/${m.total_spaces} bays` },
        { label: 'Available bays', value: m.available_spaces, icon: 'pin' as const, tone: 'info' as const, hint: `${m.areas} areas` },
        { label: 'Today’s check-ins', value: m.today_transactions, icon: 'carIn' as const, tone: 'neutral' as const, hint: `${m.today_checkouts} check-outs` },
        { label: 'Overstay alerts', value: m.overstay_alerts, icon: 'warning' as const, tone: m.overstay_alerts > 0 ? ('warning' as const) : ('neutral' as const), hint: `${m.open_overstay_incidents} open incidents` },
        { label: 'Plate review', value: m.plate_review_required, icon: 'camera' as const, tone: m.plate_review_required > 0 ? ('danger' as const) : ('neutral' as const), hint: 'awaiting review' },
      ]
    : [];

  const active = data?.active_vehicles.data ?? [];

  return (
    <Screen
      title="Dashboard"
      subtitle={company ? `${company.name} · ${today}` : today}
      compactHeader
      headerRight={
        can('operations.transactions', 'create') && isTablet ? (
          <Button title="New check-in" icon="add" size="sm" onPress={() => router.push('/transactions/check-in')} />
        ) : undefined
      }>
      <ScrollView
        contentContainerStyle={[styles.content, !isTablet && styles.contentCompact]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.primary} />}>
        {isError ? (
          <Banner title="Couldn’t load dashboard" message={error?.message} tone="danger" actionLabel="Retry" onAction={refetch} />
        ) : null}

        {/* KPI rail on phone; full grid on tablet */}
        {!isTablet ? (
          <ScrollView
            horizontal
            nestedScrollEnabled
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.kpiRail}>
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <View key={i} style={{ width: phoneCardWidth }}>
                    <Card style={[styles.skeletonCard, styles.skeletonCardCompact]}>
                      <Skeleton width={32} height={32} radius={Radius.sm} />
                      <Skeleton width="70%" height={22} />
                      <Skeleton width="50%" height={10} />
                    </Card>
                  </View>
                ))
              : kpis.map((k) => (
                  <View key={k.label} style={{ width: phoneCardWidth }}>
                    <StatCard
                      label={k.label}
                      value={k.value}
                      icon={k.icon}
                      tone={k.tone}
                      hint={k.hint}
                      compact
                    />
                  </View>
                ))}
          </ScrollView>
        ) : (
          <View style={[styles.grid, { gap: gridGap }]} onLayout={onGridLayout}>
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <View key={i} style={{ width: cardWidth }}>
                    <Card style={styles.skeletonCard}>
                      <Skeleton width={40} height={40} radius={Radius.md} />
                      <Skeleton width="70%" height={28} />
                      <Skeleton width="50%" height={12} />
                    </Card>
                  </View>
                ))
              : kpis.map((k) => (
                  <View key={k.label} style={{ width: cardWidth }}>
                    <StatCard
                      label={k.label}
                      value={k.value}
                      icon={k.icon}
                      tone={k.tone}
                      hint={k.hint}
                    />
                  </View>
                ))}
          </View>
        )}

        {/* Chart carousel + quick actions */}
        <View style={[styles.twoCol, !isTablet && styles.oneCol]}>
          <Card style={[styles.flex, !isTablet && styles.panelCompact]}>
            {m ? <DashboardChartCarousel metrics={m} compact={!isTablet} /> : <Skeleton height={166} />}
          </Card>

          <Card style={[styles.flex, !isTablet && styles.panelCompact]}>
            <Section title="Quick actions">
              <View style={styles.actions}>
                {can('operations.transactions', 'create') ? (
                  <Button title="New check-in" icon="carIn" variant="secondary" size={isTablet ? 'md' : 'sm'} onPress={() => router.push('/transactions/check-in')} fullWidth />
                ) : null}
                {can('operations.bookings', 'create') ? (
                  <Button title="New booking" icon="bookings" variant="secondary" size={isTablet ? 'md' : 'sm'} onPress={() => router.push('/bookings/create')} fullWidth />
                ) : null}
                <Button title="View all transactions" icon="transactions" variant="ghost" size={isTablet ? 'md' : 'sm'} onPress={() => router.push('/transactions')} fullWidth />
              </View>
            </Section>
          </Card>
        </View>

        {/* Currently on site */}
        <Card padded={false}>
          <View style={styles.listHead}>
            <Section title={`On site now${active.length ? ` · ${active.length}` : ''}`} action={
              <Text variant="label" tint={theme.primary} onPress={() => router.push('/transactions')}>
                See all
              </Text>
            }>
              <View />
            </Section>
          </View>
          {isLoading ? (
            <View style={styles.pad}>
              <Skeleton height={56} />
            </View>
          ) : active.length === 0 ? (
            <View style={styles.emptyOnsite}>
              <Icon name="checkCircle" size={28} color={theme.success} />
              <Text variant="body" color="textSecondary">
                No vehicles currently on site.
              </Text>
            </View>
          ) : (
            active.slice(0, 6).map((t, i) => {
              const meta = transactionStatusMeta(t.status);
              return (
                <View key={t.id}>
                  {i > 0 ? <Divider inset={Spacing.lg} /> : null}
                  <ListRow
                    title={formatPlate(t.entry_plate_number_raw)}
                    subtitle={`${t.parking_area?.name ?? ''} · ${t.parking_space?.space_code ?? ''}`}
                    meta={t.driver?.full_name ?? undefined}
                    leading={
                      <View style={[styles.rowIcon, { backgroundColor: theme.primarySoft }]}>
                        <Icon name="transactions" size={20} color={theme.primary} />
                      </View>
                    }
                    trailing={
                      <View style={styles.rowTrail}>
                        <Badge label={meta.label} tone={meta.tone} size="sm" dot />
                        <Text variant="caption" color="textMuted">
                          {durationSince(t.car_in_at)}
                        </Text>
                      </View>
                    }
                    onPress={() => router.push(`/transactions/${t.id}`)}
                  />
                </View>
              );
            })
          )}
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, gap: Spacing.lg },
  contentCompact: { padding: Spacing.md, gap: Spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  kpiRail: { gap: Spacing.sm, paddingRight: Spacing.lg },
  skeletonCard: { minHeight: 132, gap: Spacing.sm, justifyContent: 'space-between' },
  skeletonCardCompact: { minHeight: 106, padding: Spacing.md, gap: Spacing.xs },
  twoCol: { flexDirection: 'row', gap: Spacing.lg },
  oneCol: { flexDirection: 'column', gap: Spacing.md },
  flex: { flex: 1 },
  panelCompact: { padding: Spacing.md },
  actions: { gap: Spacing.sm },
  listHead: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg },
  pad: { padding: Spacing.lg },
  emptyOnsite: { alignItems: 'center', gap: Spacing.sm, padding: Spacing.xl },
  rowIcon: { width: 44, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  rowTrail: { alignItems: 'flex-end', gap: 4 },
});

import type React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ScrollView, StyleSheet, View } from 'react-native';

import { getOccupancyGrid } from '@/api/parking-spaces';
import { Badge, Card, EmptyState, Icon, Skeleton, Text } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { titleCase } from '@/lib/format';
import type { ParkingSpaceResource } from '@/api/types';

type GridParams = {
  building_id?: number;
  parking_area_id?: number;
  occupancy_status?: string;
  operational_status?: string;
};

type SummaryTileProps = { label: string; value: number; iconBg: string; iconFg: string; icon: React.ComponentProps<typeof Icon>['name'] };

function SummaryTile({ label, value, icon, iconBg, iconFg }: SummaryTileProps) {
  return (
    <View style={[summaryStyles.tile, { backgroundColor: iconBg }]}>
      <View style={summaryStyles.iconRow}>
        <Icon name={icon} size={14} color={iconFg} />
      </View>
      <Text style={[summaryStyles.value, { color: iconFg }]}>{value}</Text>
      <Text style={summaryStyles.label} numberOfLines={1}>{label}</Text>
    </View>
  );
}

const summaryStyles = StyleSheet.create({
  tile: { flex: 1, borderRadius: Radius.md, padding: Spacing.sm, gap: 2 },
  iconRow: { marginBottom: 2 },
  value: { fontSize: 22, lineHeight: 26, fontWeight: '700' },
  label: { fontSize: 11, lineHeight: 14, fontWeight: '500', opacity: 0.7 },
});

type SpaceTileProps = { space: ParkingSpaceResource };

function SpaceTile({ space }: SpaceTileProps) {
  const theme = useTheme();
  const isOccupied = space.occupancy_status === 'occupied';
  const isBlocked = space.operational_status === 'blocked' || space.operational_status === 'maintenance' || space.operational_status === 'inactive';
  const bg = isBlocked
    ? theme.neutralSoft
    : isOccupied
    ? theme.infoSoft
    : theme.successSoft;
  const fg = isBlocked
    ? theme.textMuted
    : isOccupied
    ? theme.info
    : theme.success;

  return (
    <View style={[styles.tile, { backgroundColor: bg }]}>
      <Icon name="parkingSpace" size={16} color={fg} />
      <Text variant="label" tint={fg} numberOfLines={1} style={styles.tileCode}>
        {space.space_code}
      </Text>
      {isBlocked ? (
        <Text variant="caption" tint={theme.textMuted} numberOfLines={1}>
          {titleCase(space.operational_status)}
        </Text>
      ) : (
        <Text variant="caption" tint={fg} numberOfLines={1}>
          {isOccupied ? 'Occupied' : 'Free'}
        </Text>
      )}
    </View>
  );
}

export function OccupancyGrid({ params = {} }: { params?: GridParams }) {
  const { isTablet } = useResponsive();
  const theme = useTheme();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['occupancy-grid', params],
    queryFn: () => getOccupancyGrid(params),
  });

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <View style={styles.statsRow}>
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} width="23%" height={100} />)}
        </View>
        <View style={[styles.gridRow, { flexWrap: 'wrap' }]}>
          {Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} width={isTablet ? '23%' : '31%'} height={72} />)}
        </View>
      </View>
    );
  }

  if (isError || !data) {
    return <EmptyState tone="error" title="Couldn't load occupancy grid" description={error?.message} />;
  }

  const { summary, spaces, areas } = data;

  // Group spaces by area
  const byArea = areas.map((area) => ({
    area,
    spaces: (spaces ?? []).filter((s) => s.parking_area_id === area.id),
  }));

  const numCols = isTablet ? 4 : 3;

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Summary tiles */}
      <View style={styles.statsRow}>
        <SummaryTile label="Total" value={summary.total} icon="parkingSpace" iconBg={theme.primarySoft} iconFg={theme.primary} />
        <SummaryTile label="Available" value={summary.available} icon="checkCircle" iconBg={theme.successSoft} iconFg={theme.success} />
        <SummaryTile label="Occupied" value={summary.occupied} icon="transactions" iconBg={theme.infoSoft} iconFg={theme.info} />
        <SummaryTile label="Other" value={summary.maintenance + summary.blocked + summary.inactive} icon="warning" iconBg={theme.warningSoft} iconFg={theme.warning} />
      </View>

      {/* Grid by area */}
      {byArea.map(({ area, spaces: areaSpaces }) => (
        <Card key={area.id} style={styles.areaCard}>
          <View style={styles.areaHeader}>
            <Icon name="parkingArea" size={18} color={theme.primary} />
            <Text variant="bodyStrong">{area.name}</Text>
            <Badge label={`${areaSpaces.filter((s) => s.occupancy_status === 'available').length} free`} tone="success" size="sm" />
          </View>
          <View style={[styles.grid, { gap: Spacing.xs }]}>
            {areaSpaces.map((space) => (
              <View key={space.id} style={{ width: `${Math.floor(100 / numCols) - 1}%` }}>
                <SpaceTile space={space} />
              </View>
            ))}
          </View>
        </Card>
      ))}

      {byArea.length === 0 ? (
        <EmptyState title="No spaces found" description="Adjust filters or add parking spaces." />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, gap: Spacing.lg },
  loading: { padding: Spacing.lg, gap: Spacing.lg },
  statsRow: { flexDirection: 'row', gap: Spacing.sm },
  gridRow: { flexDirection: 'row', gap: Spacing.xs },
  areaCard: { gap: Spacing.md },
  areaHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  tile: {
    padding: Spacing.sm,
    borderRadius: Radius.sm,
    alignItems: 'center',
    gap: 2,
    minHeight: 68,
    justifyContent: 'center',
  },
  tileCode: { fontSize: 11, lineHeight: 14, textAlign: 'center' },
});

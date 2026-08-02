import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useRef, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { RefreshControl, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { toApiError } from '@/api/client';
import { lookupBuildings } from '@/api/lookups';
import { listOperatingHours, updateOperatingHours, type OperatingHoursInput } from '@/api/operating-hours';
import { operatingHoursSchema, type OperatingHoursForm } from '@/api/schemas';
import type { OperatingHoursResource } from '@/api/types';
import { useSession } from '@/auth/session';
import { FormSheet } from '@/components/form-sheet';
import { OperatingDaySelector } from '@/components/operating-day-selector';
import { Screen } from '@/components/screen';
import { Badge, Banner, Card, EmptyState, Icon, PressableCard, Select, Skeleton, Text, TextField, TimeField } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { usePermissions } from '@/hooks/use-permissions';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { formatOperatingDays, formatOperatingHours, normalizeOperatingDays } from '@/lib/operating-schedule';
import { statusMeta } from '@/lib/status';
import { zodResolver } from '@/lib/zod-resolver';

export default function OperatingHoursScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { activeCompanyId } = useSession();
  const { can } = usePermissions();
  const { isTablet } = useResponsive();
  const [buildingSelection, setBuildingSelection] = useState<{ companyId: number | null; value: number | null }>({ companyId: null, value: null });
  const [editingSelection, setEditingSelection] = useState<{ companyId: number | null; area: OperatingHoursResource } | null>(null);
  const [successCompanyId, setSuccessCompanyId] = useState<number | null>(null);
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const buildingId = buildingSelection.companyId === activeCompanyId ? buildingSelection.value : null;
  const editing = editingSelection?.companyId === activeCompanyId ? editingSelection.area : null;
  const canView = can('locations.operating_hours', 'view');
  const canUpdate = can('locations.operating_hours', 'update');

  const buildingsQuery = useQuery({
    queryKey: ['lookup-buildings', activeCompanyId],
    queryFn: lookupBuildings,
    enabled: canView && activeCompanyId !== null,
  });
  const hoursQuery = useQuery({
    queryKey: ['operating-hours', activeCompanyId, buildingId],
    queryFn: () => listOperatingHours(buildingId ?? undefined),
    enabled: canView && activeCompanyId !== null,
  });

  if (!canView) {
    return (
      <Screen title="Operating Schedule">
        <EmptyState tone="error" title="You do not have access to Operating Schedule" />
      </Screen>
    );
  }

  const buildingOptions = [
    { label: 'All Buildings', value: 0 },
    ...(buildingsQuery.data ?? []).map((building) => ({ label: building.name, value: building.id })),
  ];
  const areas = hoursQuery.data?.data ?? [];

  return (
    <Screen title="Operating Schedule">
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={hoursQuery.isRefetching}
            onRefresh={hoursQuery.refetch}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }>
        <View style={styles.intro}>
          <Select
            label="Building / Site"
            value={buildingId ?? 0}
            options={buildingOptions}
            onChange={(value) => {
              setBuildingSelection({ companyId: activeCompanyId, value: (value as number) || null });
              setSuccessCompanyId(null);
            }}
            disabled={buildingsQuery.isLoading}
          />
          {successCompanyId === activeCompanyId ? (
            <Banner tone="success" icon="checkCircle" title="Operating schedule updated successfully." />
          ) : null}
          {hoursQuery.isError && areas.length > 0 ? (
            <Banner
              tone="warning"
              title="Couldn’t refresh Operating Schedule"
              message="Showing the most recently loaded settings."
              actionLabel="Retry"
              onAction={hoursQuery.refetch}
            />
          ) : null}
        </View>

        {hoursQuery.isLoading ? (
          <View style={styles.grid}>
            {Array.from({ length: 4 }).map((_, index) => (
              <Card key={index} style={[styles.card, isTablet && styles.cardTablet]}>
                <Skeleton width="55%" height={20} />
                <Skeleton width="80%" height={16} />
                <Skeleton width="100%" height={80} />
              </Card>
            ))}
          </View>
        ) : hoursQuery.isError && areas.length === 0 ? (
          <EmptyState
            tone="error"
            title="Couldn’t load Operating Schedule"
            description={hoursQuery.error?.message}
            actionLabel="Retry"
            onAction={hoursQuery.refetch}
          />
        ) : areas.length === 0 ? (
          <EmptyState icon="parkingArea" title="No Parking Areas found" />
        ) : (
          <View style={styles.grid}>
            {areas.map((area) => (
              <OperatingHoursCard
                key={area.id}
                area={area}
                tablet={isTablet}
                editable={canUpdate}
                onEdit={() => {
                  setSuccessCompanyId(null);
                  setEditingSelection({ companyId: activeCompanyId, area });
                }}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <OperatingHoursEditor
        area={editing}
        onClose={() => setEditingSelection(null)}
        onSaved={() => {
          setEditingSelection(null);
          setSuccessCompanyId(activeCompanyId);
          if (successTimer.current) clearTimeout(successTimer.current);
          successTimer.current = setTimeout(() => setSuccessCompanyId(null), 3000);
          queryClient.invalidateQueries({ queryKey: ['operating-hours'] });
          queryClient.invalidateQueries({ queryKey: ['parking-areas'] });
          if (editing) queryClient.invalidateQueries({ queryKey: ['parking-area', editing.id] });
          queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        }}
      />
    </Screen>
  );
}

function OperatingHoursCard({
  area,
  tablet,
  editable,
  onEdit,
}: {
  area: OperatingHoursResource;
  tablet: boolean;
  editable: boolean;
  onEdit: () => void;
}) {
  const theme = useTheme();
  const status = statusMeta(area.status);
  const hours = formatOperatingHours(area.effective_operating_start_time, area.effective_operating_end_time);
  const limit = area.effective_parking_time_limit_minutes === null
    ? 'No limit'
    : `${area.effective_parking_time_limit_minutes} minutes`;

  return (
    <PressableCard
      style={[styles.card, tablet && styles.cardTablet]}
      disabled={!editable}
      accessibilityRole={editable ? 'button' : undefined}
      accessibilityLabel={editable ? `Edit operating schedule for ${area.name}` : undefined}
      onPress={editable ? onEdit : undefined}>
      <View style={styles.cardHeader}>
        <View style={[styles.areaIcon, { backgroundColor: theme.primarySoft }]}>
          <Icon name="clock" size={22} color={theme.primary} />
        </View>
        <View style={styles.flex}>
          <Text variant="caption" color="textMuted" numberOfLines={1}>
            {[area.building.name, area.code].filter(Boolean).join(' · ')}
          </Text>
          <Text variant="subtitle" numberOfLines={1}>{area.name}</Text>
        </View>
        <View style={styles.cardActions}>
          <Badge label={area.inherits_building_operating_schedule ? 'Building schedule' : 'Custom schedule'} tone={area.inherits_building_operating_schedule ? 'primary' : 'neutral'} size="sm" />
          <Badge label={status.label} tone={status.tone} size="sm" dot />
        </View>
      </View>

      <View style={[styles.compactDetails, { backgroundColor: theme.surfaceAlt }]}>
        <View style={[styles.bayStat, { borderRightColor: theme.border }]}>
          <Text variant="heading">{area.active_bays_count}</Text>
          <Text variant="caption" color="textMuted">active bays</Text>
        </View>
        <View style={styles.scheduleDetails}>
          <CompactDetail label="Hours" value={hours} />
          <CompactDetail label="Days" value={formatOperatingDays(area.effective_operating_days)} />
          <CompactDetail label="Limit" value={limit} />
        </View>
      </View>
    </PressableCard>
  );
}

function CompactDetail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.compactDetailRow}>
      <Text variant="caption" color="textMuted">{label}</Text>
      <Text variant="label" numberOfLines={1} style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function OperatingHoursEditor({
  area,
  onClose,
  onSaved,
}: {
  area: OperatingHoursResource | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const theme = useTheme();
  const [topError, setTopError] = useState<string | null>(null);
  const values = useMemo<OperatingHoursForm>(() => ({
    inherits_building_operating_schedule: area?.inherits_building_operating_schedule ?? false,
    use_full_elapsed_duration: !area?.operating_start_time && !area?.operating_end_time,
    no_parking_time_limit: area?.parking_time_limit_minutes === null || area?.parking_time_limit_minutes === undefined,
    operating_start_time: toHourMinute(area?.operating_start_time),
    operating_end_time: toHourMinute(area?.operating_end_time),
    operating_days: normalizeOperatingDays(area?.operating_days),
    parking_time_limit_minutes: area?.parking_time_limit_minutes ?? null,
  }), [area]);
  const { control, handleSubmit, reset, setValue, setError } = useForm<OperatingHoursForm>({
    resolver: zodResolver(operatingHoursSchema),
    values,
  });
  const fullElapsed = useWatch({ control, name: 'use_full_elapsed_duration' });
  const noLimit = useWatch({ control, name: 'no_parking_time_limit' });
  const inherits = useWatch({ control, name: 'inherits_building_operating_schedule' });

  const mutation = useMutation({
    mutationFn: (form: OperatingHoursForm) => {
      if (!area) throw new Error('Parking Area is no longer available');
      const input: OperatingHoursInput = {
        inherits_building_operating_schedule: form.inherits_building_operating_schedule,
        ...(!form.inherits_building_operating_schedule ? {
          operating_start_time: form.use_full_elapsed_duration ? null : toHourMinute(form.operating_start_time) || null,
          operating_end_time: form.use_full_elapsed_duration ? null : toHourMinute(form.operating_end_time) || null,
          operating_days: form.operating_days,
          parking_time_limit_minutes: form.no_parking_time_limit ? null : form.parking_time_limit_minutes,
        } : {}),
      };
      return updateOperatingHours(area.id, input);
    },
    onMutate: () => setTopError(null),
    onSuccess: onSaved,
    onError: (error) => {
      const apiError = toApiError(error);
      setTopError(apiError.status === 422 ? null : apiError.message);
      Object.entries(apiError.errors).forEach(([field, messages]) => {
        setError(field.split('.')[0] as keyof OperatingHoursForm, { message: messages[0] });
      });
    },
  });
  const closeWithoutSaving = () => {
    reset(values);
    mutation.reset();
    setTopError(null);
    onClose();
  };

  return (
    <FormSheet
      visible={area !== null}
      onClose={closeWithoutSaving}
      title="Edit Operating Schedule"
      subtitle={area ? `${area.building.name} · ${area.name}` : undefined}
      onSubmit={handleSubmit((form) => mutation.mutate(form))}
      submitting={mutation.isPending}
      submitLabel="Save"
      hideCloseButton
      tabletTall
      error={topError}>
      <View style={[styles.editorSection, { borderColor: theme.border, backgroundColor: theme.surfaceAlt }]}>
        <Text variant="overline" color="textMuted">Schedule source</Text>
        <Controller control={control} name="inherits_building_operating_schedule" render={({ field }) => (
          <SettingSwitch label="Use building schedule" description="Inherit days, hours, and time limit from this building." value={field.value} onChange={(value) => field.onChange(value)} />
        )} />
        {inherits && area ? (
          <View style={styles.inheritedPreview}>
            <Badge label="Building schedule" tone="primary" size="sm" />
            <Text variant="bodyStrong">{formatOperatingDays(area.building.operating_days)}</Text>
            <Text variant="body" color="textSecondary">{formatOperatingHours(area.building.operating_start_time, area.building.operating_end_time)}</Text>
            <Text variant="caption" color="textMuted">{area.building.parking_time_limit_minutes === null ? 'No parking time limit' : `${area.building.parking_time_limit_minutes} minute limit`}</Text>
          </View>
        ) : null}
      </View>

      {!inherits ? <>
      <Controller control={control} name="operating_days" render={({ field, fieldState }) => (
        <OperatingDaySelector value={field.value} onChange={field.onChange} error={fieldState.error?.message} />
      )} />
      <View style={[styles.editorSection, { borderColor: theme.border, backgroundColor: theme.surfaceAlt }]}>
        <Text variant="overline" color="textMuted">Operating window</Text>
        <SettingSwitch
          label="Set operating window"
          description="Count parking time only during selected hours."
          value={!fullElapsed}
          onChange={(enabled) => setValue('use_full_elapsed_duration', !enabled, { shouldValidate: true })}
        />

        {!fullElapsed ? (
          <View style={styles.timeFields}>
            <Controller
              control={control}
              name="operating_start_time"
              render={({ field, fieldState }) => (
                <View style={styles.flex}>
                  <TimeField label="From" value={field.value} onChange={field.onChange} placeholder="Select time" />
                  {fieldState.error ? <Text variant="caption" tint={theme.danger}>{fieldState.error.message}</Text> : null}
                </View>
              )}
            />
            <Controller
              control={control}
              name="operating_end_time"
              render={({ field, fieldState }) => (
                <View style={styles.flex}>
                  <TimeField label="To" value={field.value} onChange={field.onChange} placeholder="Select time" />
                  {fieldState.error ? <Text variant="caption" tint={theme.danger}>{fieldState.error.message}</Text> : null}
                </View>
              )}
            />
          </View>
        ) : (
          <Text variant="caption" color="textSecondary">Current setting: Full elapsed duration</Text>
        )}
      </View>

      <View style={[styles.editorSection, { borderColor: theme.border, backgroundColor: theme.surfaceAlt }]}>
        <Text variant="overline" color="textMuted">Overstay limit</Text>
        <SettingSwitch
          label="Set time limit"
          description="Flag vehicles when counted parking time exceeds this limit."
          value={!noLimit}
          onChange={(enabled) => setValue('no_parking_time_limit', !enabled, { shouldValidate: true })}
        />

        {!noLimit ? (
          <Controller
            control={control}
            name="parking_time_limit_minutes"
            render={({ field, fieldState }) => (
              <TextField
                label="Time limit (minutes)"
                required
                keyboardType="number-pad"
                value={field.value === null ? '' : String(field.value)}
                onChangeText={(text) => field.onChange(text.trim() ? Number(text) : null)}
                error={fieldState.error?.message}
                placeholder="e.g. 120"
              />
            )}
          />
        ) : (
          <Text variant="caption" color="textSecondary">Current setting: No limit</Text>
        )}
      </View>
      </> : null}
    </FormSheet>
  );
}

function toHourMinute(value: string | null | undefined): string {
  if (!value) return '';
  const match = value.match(/^(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : value;
}

function SettingSwitch({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.switchRow}>
      <View style={styles.flex}>
        <Text variant="label">{label}</Text>
        <Text variant="caption" color="textMuted">{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: theme.borderStrong, true: theme.primary }}
        thumbColor={theme.surface}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xxxl },
  intro: { gap: Spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.lg },
  card: { width: '100%', gap: Spacing.md },
  cardTablet: { width: '47%', flexGrow: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  cardActions: { alignItems: 'flex-end', gap: Spacing.xs },
  areaIcon: { width: 40, height: 40, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  compactDetails: { flexDirection: 'row', alignItems: 'stretch', borderRadius: Radius.md, padding: Spacing.md },
  bayStat: { width: 82, justifyContent: 'center', borderRightWidth: 1, paddingRight: Spacing.md },
  scheduleDetails: { flex: 1, justifyContent: 'center', gap: Spacing.sm, paddingLeft: Spacing.md },
  compactDetailRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  detailValue: { flex: 1, textAlign: 'right' },
  timeFields: { flexDirection: 'row', gap: Spacing.md },
  editorSection: { gap: Spacing.md, padding: Spacing.lg, borderWidth: 1, borderRadius: Radius.lg },
  inheritedPreview: { gap: Spacing.xs },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  flex: { flex: 1 },
});

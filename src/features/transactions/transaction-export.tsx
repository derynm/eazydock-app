import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useQuery } from '@tanstack/react-query';
import * as Device from 'expo-device';
import { isAvailableAsync, shareAsync } from 'expo-sharing';
import { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { toApiError } from '@/api/client';
import { lookupParkingAreas } from '@/api/lookups';
import { exportTransactions, type ExportFormat } from '@/api/transactions';
import type { ListParams } from '@/api/types';
import { Button, FilterSheet, Icon, PickerSheetModal, Segmented, Select, Text } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useScheme, useTheme } from '@/hooks/use-theme';
import { confirm } from '@/lib/confirm';
import { formatDate } from '@/lib/format';
import { DRIVER_TYPES } from '@/lib/options';

const FORMATS = [
  { value: 'excel', label: 'Excel' },
  { value: 'pdf', label: 'PDF' },
] as const;

const STATUS_OPTIONS = [
  { label: 'All statuses', value: '' },
  { label: 'On site (active)', value: 'active' },
  { label: 'Overstay', value: 'overstay' },
  { label: 'Completed', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled' },
];

const DRIVER_TYPE_OPTIONS = [{ label: 'All driver types', value: '' }, ...DRIVER_TYPES];

const DATE_MODES = [
  { value: 'single', label: 'Single day' },
  { value: 'range', label: 'Date range' },
] as const;

function toISODate(d: Date): string {
  return d.toISOString().split('T')[0];
}

const today = () => toISODate(new Date());

/** Date-only picker (`YYYY-MM-DD`) — Android's native dialog, an iOS spinner sheet. */
function DateField({
  label,
  value,
  onChange,
  placeholder = 'Any date',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const theme = useTheme();
  const scheme = useScheme();
  const [iosOpen, setIosOpen] = useState(false);
  const [draft, setDraft] = useState<Date>(value ? new Date(value) : new Date());

  const open = () => {
    const base = value ? new Date(value) : new Date();
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: base,
        mode: 'date',
        onChange: (_, picked) => { if (picked) onChange(toISODate(picked)); },
      });
    } else {
      setDraft(base);
      setIosOpen(true);
    }
  };

  return (
    <View style={styles.field}>
      <Text variant="label" color="textSecondary">{label}</Text>
      <Pressable
        onPress={open}
        style={({ pressed }) => [
          styles.trigger,
          { backgroundColor: theme.surface, borderColor: theme.border },
          pressed && { borderColor: theme.primary },
        ]}>
        <Text variant="body" color={value ? 'text' : 'textMuted'} style={styles.flex}>
          {value ? formatDate(value) : placeholder}
        </Text>
        {value ? (
          <Pressable hitSlop={8} onPress={() => onChange('')}>
            <Icon name="close" size={16} color={theme.textMuted} />
          </Pressable>
        ) : (
          <Icon name="chevronDown" size={18} color={theme.textMuted} />
        )}
      </Pressable>

      {Platform.OS === 'ios' ? (
        <PickerSheetModal visible={iosOpen} onClose={() => setIosOpen(false)}>
          {(dismiss) => (
            <>
              <DateTimePicker
                value={draft}
                mode="date"
                display="spinner"
                onChange={(_, d) => d && setDraft(d)}
                themeVariant={scheme}
                style={styles.picker}
              />
              <Button
                title="Confirm"
                icon="check"
                onPress={() => {
                  onChange(toISODate(draft));
                  dismiss();
                }}
                fullWidth
              />
            </>
          )}
        </PickerSheetModal>
      ) : null}
    </View>
  );
}

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Active company building — scopes the export and the area picker. */
  buildingId?: number;
  /** Pre-selects the status so the sheet opens matching the on-screen scope. */
  initialStatus?: string;
};

/**
 * Bottom-sheet that lets the user pick a format (Excel/PDF) and filters, then
 * downloads the transactions export and opens the native share sheet on the
 * saved file. Mirrors the `FilterSheet` pattern used by the list screens.
 */
export function TransactionExportSheet({ visible, onClose, buildingId, initialStatus = '' }: Props) {
  const [format, setFormat] = useState<ExportFormat>('excel');
  const [status, setStatus] = useState(initialStatus);
  const [areaId, setAreaId] = useState<number | null>(null);
  const [driverType, setDriverType] = useState('');
  const [dateMode, setDateMode] = useState<'single' | 'range'>('single');
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [busy, setBusy] = useState(false);

  const { data: areas = [] } = useQuery({
    queryKey: ['lookup-areas', buildingId],
    queryFn: () => lookupParkingAreas(buildingId),
  });
  const areaOptions = useMemo(
    () => [{ label: 'All areas', value: 0 }, ...areas.map((a) => ({ label: a.name, value: a.id }))],
    [areas],
  );

  const handleDownload = async () => {
    if (dateFrom && dateTo && dateFrom > dateTo) {
      await confirm({ title: 'Invalid date range', message: '"From" must be on or before "To".', confirmLabel: 'OK' });
      return;
    }
    setBusy(true);
    try {
      const params: ListParams = {
        ...(buildingId ? { building_id: buildingId } : {}),
        ...(status ? { status } : {}),
        ...(areaId ? { parking_area_id: areaId } : {}),
        ...(driverType ? { driver_type: driverType } : {}),
        ...(dateFrom ? { date_from: dateFrom } : {}),
        ...(dateTo ? { date_to: dateTo } : {}),
      };
      const file = await exportTransactions(format, params);

      // The iOS Simulator can't hand app-sandboxed files to the share sheet's
      // host process (fails with "the file couldn't be opened" regardless of
      // Caches vs Documents) — a Simulator-only limitation, not a bug in the
      // export. Skip straight to a saved-file confirmation there; real
      // devices get the full share sheet below.
      const isIosSimulator = Platform.OS === 'ios' && !Device.isDevice;
      if (isIosSimulator) {
        await confirm({
          title: 'Export saved',
          message: `${file.filename} was saved. The iOS Simulator can’t open the share sheet for local files — this will share normally on a real device.`,
          confirmLabel: 'OK',
        });
        onClose();
        return;
      }

      if (!(await isAvailableAsync())) {
        await confirm({
          title: 'Sharing unavailable',
          message: 'This device can’t open the share sheet. The file was saved to the app’s storage.',
          confirmLabel: 'OK',
        });
        onClose();
        return;
      }

      // Don't close this bottom sheet before presenting the share sheet —
      // dismissing our own Modal at the same moment iOS presents the native
      // UIActivityViewController races the two transitions, so the share
      // sheet flashes and gets torn down along with our sheet's close
      // animation. Close only after the share flow is fully done.
      await shareAsync(file.uri, {
        mimeType: file.mimeType,
        UTI: file.uti,
        dialogTitle: 'Share transactions',
      });
      onClose();
    } catch (error) {
      await confirm({
        title: 'Couldn’t export',
        message: toApiError(error).message,
        confirmLabel: 'OK',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <FilterSheet visible={visible} onClose={onClose} title="Export Activity">
      <View style={styles.field}>
        <Text variant="label" color="textSecondary">
          Format
        </Text>
        <Segmented options={FORMATS as never} value={format} onChange={(v) => setFormat(v as ExportFormat)} />
      </View>

      <Select label="Status" value={status} options={STATUS_OPTIONS} onChange={setStatus} placeholder="All statuses" />

      <Select
        label="Parking area"
        value={areaId ?? 0}
        options={areaOptions}
        onChange={(v) => setAreaId((v as number) || null)}
        placeholder="All areas"
      />

      <Select
        label="Driver type"
        value={driverType}
        options={DRIVER_TYPE_OPTIONS}
        onChange={setDriverType}
        placeholder="All driver types"
      />

      <View style={styles.field}>
        <Text variant="label" color="textSecondary">Date</Text>
        <Segmented
          options={DATE_MODES as never}
          value={dateMode}
          onChange={(v) => {
            const mode = v as 'single' | 'range';
            setDateMode(mode);
            if (mode === 'single') setDateTo(dateFrom);
          }}
        />
      </View>

      {dateMode === 'single' ? (
        <DateField
          label="Date"
          value={dateFrom}
          onChange={(v) => { setDateFrom(v); setDateTo(v); }}
          placeholder="Any date"
        />
      ) : (
        <View style={styles.dateRow}>
          <View style={styles.dateCol}>
            <DateField label="From" value={dateFrom} onChange={setDateFrom} placeholder="Any date" />
          </View>
          <View style={styles.dateCol}>
            <DateField label="To" value={dateTo} onChange={setDateTo} placeholder="Any date" />
          </View>
        </View>
      )}

      <Button
        title={busy ? 'Preparing…' : 'Download'}
        icon="share"
        onPress={handleDownload}
        loading={busy}
        fullWidth
      />
    </FilterSheet>
  );
}

const styles = StyleSheet.create({
  field: { gap: Spacing.xs },
  dateRow: { flexDirection: 'row', gap: Spacing.md },
  dateCol: { flex: 1 },
  flex: { flex: 1 },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: 48,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  picker: { width: '100%', maxWidth: 320, height: 216, alignSelf: 'center' },
});

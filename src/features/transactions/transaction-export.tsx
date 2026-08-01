import * as Device from 'expo-device';
import { isAvailableAsync, shareAsync } from 'expo-sharing';
import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { toApiError } from '@/api/client';
import { exportTransactions, type ExportFormat } from '@/api/transactions';
import type { ListParams } from '@/api/types';
import { Button, FilterSheet, Segmented, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { confirm } from '@/lib/confirm';

const FORMATS = [
  { value: 'excel', label: 'Excel' },
  { value: 'pdf', label: 'PDF' },
] as const;

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Current list filters, so the downloaded file matches the screen. */
  filters: ListParams;
};

/**
 * Downloads the current filtered transaction list in the selected format and
 * opens the native share sheet. Filtering stays on the transaction screen.
 */
export function TransactionExportSheet({ visible, onClose, filters }: Props) {
  const [format, setFormat] = useState<ExportFormat>('excel');
  const [busy, setBusy] = useState(false);

  const handleDownload = async () => {
    setBusy(true);
    try {
      const file = await exportTransactions(format, filters);

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

      <Text variant="body" color="textSecondary">
        Downloads all transactions matching the filters currently applied to this page.
      </Text>

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
});

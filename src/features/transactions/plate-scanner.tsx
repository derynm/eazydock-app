/**
 * PlateScanner — full-screen live camera scanner that auto-fills a plate number.
 *
 * Capture mode: expo-camera stills every ~800 ms (v1). A confident read
 * auto-accepts; the operator can also type manually via the escape link.
 */
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text as RNText,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Radius, Spacing, FontSize } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { readPlate, type PlateReadResult } from './ocr/plate-ocr';
import { normalisePlate } from '@/lib/plate';
import { Icon } from '@/components/ui/icon';

type ScanState =
  | { kind: 'permission' }
  | { kind: 'denied' }
  | { kind: 'idle' }
  | { kind: 'scanning' }
  | { kind: 'found'; result: PlateReadResult };

type Props = {
  visible: boolean;
  onResult: (result: PlateReadResult) => void;
  onClose: () => void;
};

const SCAN_INTERVAL_MS = 800;
const CONFIDENCE_THRESHOLD = 0.35;

export function PlateScanner({ visible, onResult, onClose }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [state, setState] = useState<ScanState>({ kind: 'idle' });
  const cameraRef = useRef<CameraView>(null);
  const scanning = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset on each open.
  useEffect(() => {
    if (visible) {
      setState({ kind: permission?.granted ? 'idle' : 'permission' });
      setTorch(false);
      scanning.current = false;
    }
  }, [visible, permission?.granted]);

  // Auto-scan loop while scanner is open and no plate found yet.
  useEffect(() => {
    if (!visible) {
      clearInterval(intervalRef.current ?? undefined);
      intervalRef.current = null;
      scanning.current = false;
      return;
    }

    const tick = async () => {
      if (scanning.current || state.kind === 'found' || state.kind === 'permission' || state.kind === 'denied') return;
      if (!cameraRef.current) return;

      scanning.current = true;
      setState({ kind: 'scanning' });

      try {
        const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 });
        if (!photo) { scanning.current = false; setState({ kind: 'idle' }); return; }

        const result = await readPlate(photo.uri, photo.width, photo.height);
        console.log('[OCR]', result ?? 'no result');

        if (result && normalisePlate(result.plate).length >= 2 && result.confidence >= CONFIDENCE_THRESHOLD) {
          setState({ kind: 'found', result });
          clearInterval(intervalRef.current ?? undefined);
          intervalRef.current = null;
          // Brief confirmation delay before auto-close.
          setTimeout(() => {
            onResult({ ...result, plate: normalisePlate(result.plate) });
            onClose();
          }, 900);
        } else {
          setState({ kind: 'idle' });
        }
      } catch {
        setState({ kind: 'idle' });
      } finally {
        scanning.current = false;
      }
    };

    intervalRef.current = setInterval(tick, SCAN_INTERVAL_MS);
    return () => { clearInterval(intervalRef.current ?? undefined); intervalRef.current = null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, state.kind]);

  const handleRequestPermission = useCallback(async () => {
    const result = await requestPermission();
    setState(result.granted ? { kind: 'idle' } : { kind: 'denied' });
  }, [requestPermission]);

  if (!visible) return null;

  const statusLabel =
    state.kind === 'scanning' ? 'Detecting…' :
    state.kind === 'found' ? `${normalisePlate(state.result.plate)} ✓` :
    'Point at the plate';

  const statusColor =
    state.kind === 'found' ? theme.success :
    state.kind === 'scanning' ? theme.textSecondary :
    '#FFFFFF';

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent>
      <View style={styles.root}>
        {/* Camera or permission gate */}
        {permission?.granted ? (
          <CameraView
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            facing="back"
            enableTorch={torch}
          />
        ) : (
          <View style={[styles.permGate, { backgroundColor: theme.background }]}>
            {state.kind === 'denied' ? (
              <RNText style={[styles.permText, { color: theme.text }]}>
                Camera permission denied. Enable it in Settings to scan plates.
              </RNText>
            ) : (
              <Pressable style={[styles.permBtn, { backgroundColor: theme.primary }]} onPress={handleRequestPermission}>
                <RNText style={[styles.permBtnText, { color: theme.onPrimary }]}>Allow Camera</RNText>
              </Pressable>
            )}
          </View>
        )}

        {/* Status text pinned to bottom */}
        {permission?.granted ? (
          <View style={[styles.statusWrapper, { bottom: insets.bottom + Spacing.xxl }]} pointerEvents="box-none">
            <View style={styles.statusRow}>
              {state.kind === 'scanning' ? (
                <ActivityIndicator color="#FFFFFF" size="small" style={{ marginRight: 8 }} />
              ) : null}
              <RNText style={[styles.statusText, { color: statusColor }]}>{statusLabel}</RNText>
            </View>
            <Pressable onPress={onClose} style={styles.manualLink} pointerEvents="auto">
              <RNText style={styles.manualText}>Type manually</RNText>
            </Pressable>
          </View>
        ) : null}

        {/* Top bar: close + torch */}
        <View style={[styles.topBar, { paddingTop: insets.top + Spacing.sm }]}>
          <Pressable style={styles.iconBtn} onPress={onClose} hitSlop={12}>
            <Icon name="close" size={24} color="#FFFFFF" />
          </Pressable>
          {permission?.granted ? (
            <Pressable style={styles.iconBtn} onPress={() => setTorch((t) => !t)} hitSlop={12}>
              <Icon name={torch ? 'torch' : 'torchOff'} size={24} color="#FFFFFF" />
            </Pressable>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}


const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  permGate: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  permText: { fontSize: FontSize.base, textAlign: 'center', marginBottom: Spacing.xl },
  permBtn: { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: Radius.md },
  permBtnText: { fontSize: FontSize.base, fontWeight: '600' },

  statusWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  statusText: { fontSize: FontSize.md, fontWeight: '600', color: '#FFFFFF', textAlign: 'center' },

  manualLink: { marginTop: Spacing.lg, alignItems: 'center' },
  manualText: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.65)', textDecorationLine: 'underline' },

  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

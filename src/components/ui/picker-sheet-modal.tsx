import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  children: (dismiss: () => void) => ReactNode;
};

export function PickerSheetModal({ visible, onClose, children }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [backdropOpacity] = useState(() => new Animated.Value(0));
  const [sheetTranslateY] = useState(() => new Animated.Value(400));

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true,
      }),
      Animated.timing(sheetTranslateY, {
        toValue: 400,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(onClose);
  };

  useEffect(() => {
    if (!visible) return;

    backdropOpacity.setValue(0);
    sheetTranslateY.setValue(400);
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(sheetTranslateY, {
        toValue: 0,
        duration: 240,
        useNativeDriver: true,
      }),
    ]).start();
  }, [backdropOpacity, sheetTranslateY, visible]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={dismiss}>
      <View style={styles.scrim}>
        <Animated.View
          pointerEvents="none"
          style={[styles.backdrop, { backgroundColor: theme.scrim, opacity: backdropOpacity }]}
        />
        <Pressable style={styles.backdrop} onPress={dismiss} />
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.surface,
              paddingBottom: Spacing.lg + insets.bottom,
              transform: [{ translateY: sheetTranslateY }],
            },
          ]}>
          {children(dismiss)}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  sheet: {
    padding: Spacing.lg,
    gap: Spacing.md,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
  },
});

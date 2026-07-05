import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Animated, Modal, PanResponder, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const DISMISS_THRESHOLD_Y = 80;
const DISMISS_THRESHOLD_V = 0.5;

type Props = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
};

export function FilterSheet({ visible, onClose, title = 'Filters', children }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(400)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [modalVisible, setModalVisible] = useState(false);

  // Keep a stable ref so PanResponder callbacks always call the latest onClose.
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  const pan = useRef(
    PanResponder.create({
      // Claim the touch immediately when the user presses the handle area.
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gs) => {
        if (gs.dy > 0) {
          slideAnim.setValue(gs.dy);
          fadeAnim.setValue(Math.max(0, 1 - gs.dy / 300));
        }
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > DISMISS_THRESHOLD_Y || gs.vy > DISMISS_THRESHOLD_V) {
          onCloseRef.current();
        } else {
          Animated.spring(slideAnim, { toValue: 0, damping: 26, stiffness: 220, useNativeDriver: true }).start();
          Animated.timing(fadeAnim, { toValue: 1, duration: 100, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    if (visible) {
      setModalVisible(true);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, damping: 26, stiffness: 220, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 160, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 400, duration: 200, useNativeDriver: true }),
      ]).start(() => setModalVisible(false));
    }
  }, [visible]);

  return (
    <Modal visible={modalVisible} animationType="none" transparent onRequestClose={onClose}>
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: fadeAnim }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            { backgroundColor: theme.surface, paddingBottom: insets.bottom + Spacing.md },
            { transform: [{ translateY: slideAnim }] },
          ]}>
          {/* Draggable handle area */}
          <View style={styles.handleArea} {...pan.panHandlers}>
            <View style={[styles.handle, { backgroundColor: theme.border }]} />
            <View style={[styles.header, { borderBottomColor: theme.border }]}>
              <Text variant="subtitle">{title}</Text>
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
  },
  handleArea: { paddingTop: Spacing.sm },
  handle: { width: 36, height: 4, borderRadius: Radius.pill, alignSelf: 'center' },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  body: { padding: Spacing.lg, gap: Spacing.lg },
});

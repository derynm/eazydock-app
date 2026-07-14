import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { Icon } from './icon';

export type ViewMode = 'cards' | 'table';

type Props = {
  value: ViewMode;
  onChange: (value: ViewMode) => void;
};

export function ViewModeToggle({ value, onChange }: Props) {
  const theme = useTheme();
  const activeIndex = value === 'cards' ? 0 : 1;
  const progress = useSharedValue(activeIndex);

  useEffect(() => {
    progress.value = withSpring(activeIndex, { damping: 18, stiffness: 220 });
  }, [activeIndex, progress]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: 3 + progress.value * 40 }],
  }));
  const cardIconStyle = useAnimatedStyle(() => {
    const selected = 1 - Math.min(1, Math.abs(progress.value));
    return {
      opacity: 0.65 + selected * 0.35,
      transform: [{ scale: 0.94 + selected * 0.12 }],
    };
  });
  const tableIconStyle = useAnimatedStyle(() => {
    const selected = 1 - Math.min(1, Math.abs(progress.value - 1));
    return {
      opacity: 0.65 + selected * 0.35,
      transform: [{ scale: 0.94 + selected * 0.12 }],
    };
  });

  return (
    <View
      accessibilityRole="radiogroup"
      style={[styles.track, { backgroundColor: theme.surfaceSunken, borderColor: theme.border }]}>
      <Animated.View
        pointerEvents="none"
        style={[styles.indicator, { backgroundColor: theme.surface }, indicatorStyle]}
      />
      <Pressable
        accessibilityRole="radio"
        accessibilityLabel="Card view"
        accessibilityState={{ checked: value === 'cards' }}
        onPress={() => onChange('cards')}
        style={styles.option}>
        <Animated.View style={cardIconStyle}>
          <Icon name="listView" size={18} color={value === 'cards' ? theme.primary : theme.textMuted} />
        </Animated.View>
      </Pressable>
      <Pressable
        accessibilityRole="radio"
        accessibilityLabel="Table view"
        accessibilityState={{ checked: value === 'table' }}
        onPress={() => onChange('table')}
        style={styles.option}>
        <Animated.View style={tableIconStyle}>
          <Icon name="tableView" size={18} color={value === 'table' ? theme.primary : theme.textMuted} />
        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    padding: 3,
    gap: 2,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  indicator: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    left: 0,
    width: 38,
    borderRadius: Radius.sm,
    shadowColor: '#0B1F33',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  option: {
    width: 38,
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.sm,
    zIndex: 1,
  },
});

import { useEffect } from 'react';
import { StyleSheet, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = { width?: number | `${number}%`; height?: number; radius?: number; style?: ViewStyle };

export function Skeleton({ width = '100%', height = 16, radius = Radius.sm, style }: Props) {
  const theme = useTheme();
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 850 }), -1, true);
  }, [opacity]);

  const animated = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        { width, height, borderRadius: radius, backgroundColor: theme.skeleton },
        animated,
        style,
      ]}
    />
  );
}

export function SkeletonRows({ count = 6 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <Animated.View key={i} style={styles.row}>
          <Skeleton width={44} height={44} radius={Radius.md} />
          <Animated.View style={styles.rowText}>
            <Skeleton width="60%" height={14} />
            <Skeleton width="38%" height={12} />
          </Animated.View>
          <Skeleton width={56} height={22} radius={Radius.pill} />
        </Animated.View>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16 },
  rowText: { flex: 1, gap: 8 },
});

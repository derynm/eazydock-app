import { Image, StyleSheet, View } from 'react-native';

import logoMark from '@/assets/images/android-icon-monochrome.png';
import { Text } from '@/components/ui';
import { Brand, Radius } from '@/constants/theme';

export function BrandMark({ size = 40 }: { size?: number }) {
  return (
    <View style={[styles.mark, { width: size, height: size, borderRadius: size * 0.28, backgroundColor: Brand[500] }]}>
      <Image source={logoMark} style={{ width: size * 0.62, height: size * 0.62, tintColor: '#FFFFFF' }} resizeMode="contain" />
    </View>
  );
}

export function Wordmark({ tint, size = 'lg' }: { tint?: string; size?: 'lg' | 'md' }) {
  return (
    <View style={styles.row}>
      <BrandMark size={size === 'lg' ? 40 : 32} />
      <View>
        <Text variant={size === 'lg' ? 'subtitle' : 'bodyStrong'} tint={tint}>
          eazydock
        </Text>
        <Text variant="caption" tint={tint} style={styles.tag}>
          Operations
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mark: { alignItems: 'center', justifyContent: 'center', borderRadius: Radius.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tag: { opacity: 0.6, letterSpacing: 0.4 },
});

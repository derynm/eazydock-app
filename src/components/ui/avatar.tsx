import { StyleSheet, View } from 'react-native';

import { Brand } from '@/constants/theme';

import { Text } from './text';

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Deterministic brand-family color from the name.
const PALETTE = [Brand[500], Brand[700], '#0E7C86', '#7C3AED', '#B45309', '#15803D', '#BE185D'];
function colorFor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const bg = colorFor(name);
  return (
    <View style={[styles.base, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg }]}>
      <Text variant="label" tint="#FFFFFF" style={{ fontSize: size * 0.36, lineHeight: size * 0.36 * 1.1 }}>
        {initials(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
});

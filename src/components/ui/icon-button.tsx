import { Pressable, type PressableProps, StyleSheet } from 'react-native';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { Icon, type IconName } from './icon';

type Props = Omit<PressableProps, 'children'> & {
  name: IconName;
  size?: number;
  color?: string;
  /** Show a soft surface background behind the glyph. */
  surface?: boolean;
  accessibilityLabel: string;
};

export function IconButton({ name, size = 22, color, surface, style, ...rest }: Props) {
  const theme = useTheme();
  const box = size + 18;
  return (
    <Pressable
      hitSlop={8}
      style={(state) => [
        styles.base,
        { width: box, height: box },
        surface && { backgroundColor: theme.surfaceSunken },
        'pressed' in state && state.pressed && { opacity: 0.6 },
        typeof style === 'function' ? style(state) : style,
      ]}
      {...rest}>
      <Icon name={name} size={size} color={color ?? theme.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', borderRadius: Radius.md },
});

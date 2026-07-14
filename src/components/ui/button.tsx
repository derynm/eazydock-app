import { ActivityIndicator, Pressable, type PressableProps, StyleSheet, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { Icon, type IconName } from './icon';
import { Text } from './text';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
type Size = 'sm' | 'md' | 'lg';

type Props = Omit<PressableProps, 'children'> & {
  title: string;
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  iconRight?: IconName;
  loading?: boolean;
  fullWidth?: boolean;
};

const HEIGHTS: Record<Size, number> = { sm: 36, md: 44, lg: 52 };

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  loading,
  fullWidth,
  disabled,
  style,
  ...rest
}: Props) {
  const theme = useTheme();
  const isDisabled = disabled || loading;

  const bg: Record<Variant, string> = {
    primary: theme.primary,
    secondary: theme.surface,
    ghost: 'transparent',
    danger: theme.danger,
    success: theme.success,
  };
  const fg: Record<Variant, string> = {
    primary: theme.onPrimary,
    secondary: theme.text,
    ghost: theme.primary,
    danger: '#FFFFFF',
    success: '#FFFFFF',
  };
  const border: Record<Variant, string> = {
    primary: 'transparent',
    secondary: theme.border,
    ghost: 'transparent',
    danger: 'transparent',
    success: 'transparent',
  };

  const iconSize = size === 'sm' ? 16 : 18;

  return (
    <Pressable
      disabled={isDisabled}
      style={(state) => [
        styles.base,
        {
          height: HEIGHTS[size],
          paddingHorizontal: size === 'sm' ? Spacing.md : Spacing.lg,
          backgroundColor: bg[variant],
          borderColor: border[variant],
          borderWidth: variant === 'secondary' ? StyleSheet.hairlineWidth * 2 : 0,
          opacity: isDisabled ? 0.5 : 'pressed' in state && state.pressed ? 0.85 : 1,
        },
        fullWidth && styles.fullWidth,
        style as object,
      ]}
      {...rest}>
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator color={fg[variant]} size="small" />
        ) : icon ? (
          <Icon name={icon} size={iconSize} color={fg[variant]} weight="semibold" />
        ) : null}
        <Text variant={size === 'sm' ? 'label' : 'bodyStrong'} tint={fg[variant]} numberOfLines={1}>
          {title}
        </Text>
        {!loading && iconRight ? <Icon name={iconRight} size={iconSize} color={fg[variant]} weight="semibold" /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: { alignSelf: 'stretch' },
  content: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
});

import { StyleSheet, Text as RNText, type TextProps } from 'react-native';

import { FontSize, Fonts, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type TextVariant =
  | 'display'
  | 'title'
  | 'heading'
  | 'subtitle'
  | 'body'
  | 'bodyStrong'
  | 'label'
  | 'caption'
  | 'overline'
  | 'mono';

export type AppTextProps = TextProps & {
  variant?: TextVariant;
  color?: ThemeColor;
  /** Override with any raw color string (e.g. status colors). */
  tint?: string;
  center?: boolean;
};

export function Text({
  variant = 'body',
  color = 'text',
  tint,
  center,
  style,
  ...rest
}: AppTextProps) {
  const theme = useTheme();
  return (
    <RNText
      style={[
        { color: tint ?? theme[color] },
        styles[variant],
        center && styles.center,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
  display: { fontFamily: Fonts.sans, fontSize: 32, lineHeight: 38, fontWeight: '700', letterSpacing: -0.4 },
  title: { fontFamily: Fonts.sans, fontSize: 26, lineHeight: 32, fontWeight: '700', letterSpacing: -0.3 },
  heading: { fontFamily: Fonts.sans, fontSize: 21, lineHeight: 27, fontWeight: '700', letterSpacing: -0.2 },
  subtitle: { fontFamily: Fonts.sans, fontSize: 17, lineHeight: 23, fontWeight: '600' },
  body: { fontFamily: Fonts.sans, fontSize: FontSize.base, lineHeight: 22, fontWeight: '400' },
  bodyStrong: { fontFamily: Fonts.sans, fontSize: FontSize.base, lineHeight: 22, fontWeight: '600' },
  label: { fontFamily: Fonts.sans, fontSize: FontSize.sm, lineHeight: 18, fontWeight: '600' },
  caption: { fontFamily: Fonts.sans, fontSize: FontSize.xs, lineHeight: 16, fontWeight: '400' },
  overline: { fontFamily: Fonts.sans, fontSize: 11, lineHeight: 14, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase' },
  mono: { fontFamily: Fonts.mono, fontSize: FontSize.sm, lineHeight: 18, fontWeight: '500' },
});

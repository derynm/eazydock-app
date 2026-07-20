import { forwardRef, useState } from 'react';
import { StyleSheet, TextInput, type TextInputProps, View } from 'react-native';

import { useErrorScrollField } from '@/components/form-error-scroll';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { Icon, type IconName } from './icon';
import { IconButton } from './icon-button';
import { Text } from './text';

type Props = TextInputProps & {
  label?: string;
  error?: string;
  hint?: string;
  icon?: IconName;
  required?: boolean;
  /** Toggleable password field. */
  secure?: boolean;
  /** Element rendered after the input inside the input row (e.g. an icon button). */
  trailing?: React.ReactNode;
};

export const TextField = forwardRef<TextInput, Props>(function TextField(
  { label, error, hint, icon, required, secure, trailing, style, onFocus, onBlur, ...rest },
  ref,
) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(!!secure);
  const errorScrollRef = useErrorScrollField(error);

  const borderColor = error ? theme.danger : focused ? theme.primary : theme.border;

  return (
    <View ref={errorScrollRef} style={styles.field}>
      {label ? (
        <Text variant="label" color="textSecondary">
          {label}
          {required ? <Text variant="label" tint={theme.danger}> *</Text> : null}
        </Text>
      ) : null}
      <View
        style={[
          styles.inputRow,
          { backgroundColor: theme.surface, borderColor },
          focused && { borderWidth: 1.5 },
        ]}>
        {icon ? <Icon name={icon} size={18} color={theme.textMuted} /> : null}
        <TextInput
          ref={ref}
          placeholderTextColor={theme.textMuted}
          style={[styles.input, { color: theme.text }, style]}
          secureTextEntry={hidden}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...rest}
        />
        {trailing ?? null}
        {secure ? (
          <IconButton
            name={hidden ? 'eye' : 'eyeOff'}
            size={18}
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
            onPress={() => setHidden((h) => !h)}
          />
        ) : null}
      </View>
      {error ? (
        <Text variant="caption" tint={theme.danger}>
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" color="textMuted">
          {hint}
        </Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  field: { gap: Spacing.sm },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: 48,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  input: { flex: 1, fontFamily: Fonts.sans, fontSize: 15, fontWeight: '400', paddingVertical: Spacing.md },
});

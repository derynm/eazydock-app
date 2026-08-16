import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { useErrorScrollField } from '@/components/form-error-scroll';
import { Radius, Spacing } from '@/constants/theme';
import { useScheme, useTheme } from '@/hooks/use-theme';
import { formatDateTime } from '@/lib/format';
import {
  pickerDateFromSydneyValue,
  sydneyDateTimeValueFromPicker,
  sydneyNowPickerDate,
  toSydneyDateTimeValue,
} from '@/lib/sydney-time';

import { Button } from './button';
import { Icon } from './icon';
import { PickerSheetModal } from './picker-sheet-modal';
import { Text } from './text';

type Props = {
  label?: string;
  value: string; // ISO or ''
  onChange: (iso: string) => void;
  error?: string;
  required?: boolean;
  clearable?: boolean;
  placeholder?: string;
};

export function DateTimeField({
  label,
  value,
  onChange,
  error,
  required,
  clearable = false,
  placeholder = 'Select date & time',
}: Props) {
  const theme = useTheme();
  const scheme = useScheme();
  const [iosOpen, setIosOpen] = useState(false);
  const [draft, setDraft] = useState<Date>(() => (value ? pickerDateFromSydneyValue(value) : sydneyNowPickerDate()));
  const errorScrollRef = useErrorScrollField(error);

  const open = () => {
    const base = value ? pickerDateFromSydneyValue(value) : sydneyNowPickerDate();
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: base,
        mode: 'date',
        onChange: (_, picked) => {
          if (!picked) return;
          DateTimePickerAndroid.open({
            value: picked,
            mode: 'time',
            is24Hour: true,
            onChange: (__, time) => {
              if (time) onChange(sydneyDateTimeValueFromPicker(time));
            },
          });
        },
      });
    } else {
      setDraft(base);
      setIosOpen(true);
    }
  };

  return (
    <View ref={errorScrollRef} style={styles.field}>
      {label ? (
        <Text variant="label" color="textSecondary">
          {label}
          {required ? <Text variant="label" tint={theme.danger}> *</Text> : null}
        </Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label ?? 'Date and time'}: ${value ? formatDateTime(toSydneyDateTimeValue(value)) : placeholder}`}
        onPress={open}
        style={({ pressed }) => [
          styles.trigger,
          { backgroundColor: theme.surface, borderColor: error ? theme.danger : theme.border },
          pressed && { borderColor: theme.primary },
        ]}>
        <Icon name="bookings" size={18} color={theme.textMuted} />
        <Text variant="body" color={value ? 'text' : 'textMuted'} style={styles.flex}>
          {value ? formatDateTime(toSydneyDateTimeValue(value)) : placeholder}
        </Text>
        {value && clearable ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Clear ${(label ?? 'date and time').toLowerCase()}`}
            hitSlop={8}
            onPress={(event) => {
              event.stopPropagation();
              onChange('');
            }}>
            <Icon name="close" size={16} color={theme.textMuted} />
          </Pressable>
        ) : (
          <Icon name="chevronDown" size={18} color={theme.textMuted} />
        )}
      </Pressable>
      {error ? (
        <Text variant="caption" tint={theme.danger}>
          {error}
        </Text>
      ) : null}

      {Platform.OS === 'ios' ? (
        <PickerSheetModal visible={iosOpen} onClose={() => setIosOpen(false)}>
          {(dismiss) => (
            <>
              <DateTimePicker
                value={draft}
                mode="datetime"
                display="spinner"
                locale="en-GB"
                onChange={(_, d) => d && setDraft(d)}
                themeVariant={scheme}
                style={styles.picker}
              />
              <Button
                title="Confirm"
                icon="check"
                onPress={() => {
                  onChange(sydneyDateTimeValueFromPicker(draft));
                  dismiss();
                }}
                fullWidth
              />
            </>
          )}
        </PickerSheetModal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: Spacing.sm },
  flex: { flex: 1 },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: 48,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  picker: { width: '100%', maxWidth: 320, height: 216, alignSelf: 'center' },
});

import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { useErrorScrollField } from '@/components/form-error-scroll';
import { Radius, Spacing } from '@/constants/theme';
import { useScheme, useTheme } from '@/hooks/use-theme';
import { formatDateTime } from '@/lib/format';

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
};

export function DateTimeField({ label, value, onChange, error, required }: Props) {
  const theme = useTheme();
  const scheme = useScheme();
  const [iosOpen, setIosOpen] = useState(false);
  const [draft, setDraft] = useState<Date>(value ? new Date(value) : new Date());
  const errorScrollRef = useErrorScrollField(error);

  const open = () => {
    const base = value ? new Date(value) : new Date();
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: base,
        mode: 'date',
        onChange: (_, picked) => {
          if (!picked) return;
          DateTimePickerAndroid.open({
            value: picked,
            mode: 'time',
            onChange: (__, time) => {
              if (time) onChange(time.toISOString());
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
        onPress={open}
        style={({ pressed }) => [
          styles.trigger,
          { backgroundColor: theme.surface, borderColor: error ? theme.danger : theme.border },
          pressed && { borderColor: theme.primary },
        ]}>
        <Icon name="bookings" size={18} color={theme.textMuted} />
        <Text variant="body" color={value ? 'text' : 'textMuted'} style={styles.flex}>
          {value ? formatDateTime(value) : 'Select date & time'}
        </Text>
        <Icon name="chevronDown" size={18} color={theme.textMuted} />
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
                onChange={(_, d) => d && setDraft(d)}
                themeVariant={scheme}
                style={styles.picker}
              />
              <Button
                title="Confirm"
                icon="check"
                onPress={() => {
                  onChange(draft.toISOString());
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

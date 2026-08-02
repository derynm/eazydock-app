import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useScheme, useTheme } from '@/hooks/use-theme';

import { Button } from './button';
import { Icon } from './icon';
import { PickerSheetModal } from './picker-sheet-modal';
import { Text } from './text';

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  clearable?: boolean;
};

function fromTime(value: string): Date {
  const [hours, minutes] = value.split(':').map(Number);
  const date = new Date();
  date.setHours(hours || 0, minutes || 0, 0, 0);
  return date;
}

function toTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function displayTime(value: string): string {
  const time = fromTime(value);
  return `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`;
}

export function TimeField({ label, value, onChange, placeholder = 'Any time', clearable = false }: Props) {
  const theme = useTheme();
  const scheme = useScheme();
  const [iosOpen, setIosOpen] = useState(false);
  const [draft, setDraft] = useState(() => (value ? fromTime(value) : new Date()));

  const open = () => {
    const base = value ? fromTime(value) : new Date();
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: base,
        mode: 'time',
        onChange: (_, picked) => {
          if (picked) onChange(toTime(picked));
        },
      });
    } else {
      setDraft(base);
      setIosOpen(true);
    }
  };

  return (
    <View style={styles.field}>
      <Text variant="label" color="textSecondary">{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value ? displayTime(value) : placeholder}`}
        onPress={open}
        style={({ pressed }) => [
          styles.trigger,
          { backgroundColor: theme.surface, borderColor: theme.border },
          pressed && { borderColor: theme.primary },
        ]}>
        <Icon name="clock" size={18} color={theme.textMuted} />
        <Text variant="body" color={value ? 'text' : 'textMuted'} style={styles.flex}>
          {value ? displayTime(value) : placeholder}
        </Text>
        {value && clearable ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Clear ${label.toLowerCase()}`}
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

      {Platform.OS === 'ios' ? (
        <PickerSheetModal visible={iosOpen} onClose={() => setIosOpen(false)}>
          {(dismiss) => (
            <>
              <DateTimePicker
                value={draft}
                mode="time"
                display="spinner"
                onChange={(_, time) => time && setDraft(time)}
                themeVariant={scheme}
                style={styles.picker}
              />
              <Button
                title="Confirm"
                icon="check"
                onPress={() => {
                  onChange(toTime(draft));
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
  field: { gap: Spacing.xs },
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

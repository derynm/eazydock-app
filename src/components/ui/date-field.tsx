import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useScheme, useTheme } from '@/hooks/use-theme';
import { formatDate } from '@/lib/format';

import { Button } from './button';
import { Icon } from './icon';
import { PickerSheetModal } from './picker-sheet-modal';
import { Text } from './text';

function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function fromISODate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return year && month && day ? new Date(year, month - 1, day) : new Date();
}

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

/** Date-only picker whose value is represented as `YYYY-MM-DD`. */
export function DateField({ label, value, onChange, placeholder = 'Date' }: Props) {
  const theme = useTheme();
  const scheme = useScheme();
  const [iosOpen, setIosOpen] = useState(false);
  const [draft, setDraft] = useState<Date>(() => (value ? fromISODate(value) : new Date()));

  const open = () => {
    const base = value ? fromISODate(value) : new Date();
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: base,
        mode: 'date',
        onChange: (_, picked) => {
          if (picked) onChange(toISODate(picked));
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
        accessibilityLabel={`${label}: ${value || placeholder}`}
        onPress={open}
        style={({ pressed }) => [
          styles.trigger,
          { backgroundColor: theme.surface, borderColor: theme.border },
          pressed && { borderColor: theme.primary },
        ]}>
        <Text variant="body" color={value ? 'text' : 'textMuted'} style={styles.flex}>
          {value ? formatDate(value) : placeholder}
        </Text>
        {value ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Clear ${label.toLowerCase()}`}
            hitSlop={8}
            onPress={() => onChange('')}>
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
                mode="date"
                display="spinner"
                onChange={(_, date) => date && setDraft(date)}
                themeVariant={scheme}
                style={styles.picker}
              />
              <Button
                title="Confirm"
                icon="check"
                onPress={() => {
                  onChange(toISODate(draft));
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

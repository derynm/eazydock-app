import { Pressable, StyleSheet, View } from 'react-native';

import type { OperatingDay } from '@/api/types';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ALL_OPERATING_DAYS } from '@/lib/operating-schedule';

import { Text } from './ui';

const LABELS: Record<OperatingDay, string> = {
  monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu',
  friday: 'Fri', saturday: 'Sat', sunday: 'Sun',
};

export function OperatingDaySelector({ value, onChange, error, disabled = false }: {
  value: OperatingDay[];
  onChange: (days: OperatingDay[]) => void;
  error?: string;
  disabled?: boolean;
}) {
  const theme = useTheme();
  return (
    <View style={styles.field}>
      <Text variant="label" color="textSecondary">Operation days</Text>
      <View style={styles.chips}>
        {ALL_OPERATING_DAYS.map((day) => {
          const selected = value.includes(day);
          return (
            <Pressable
              key={day}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selected, disabled }}
              disabled={disabled}
              onPress={() => onChange(selected ? value.filter((item) => item !== day) : ALL_OPERATING_DAYS.filter((item) => item === day || value.includes(item)))}
              style={({ pressed }) => [
                styles.chip,
                { borderColor: selected ? theme.primary : theme.border, backgroundColor: selected ? theme.primarySoft : theme.surface },
                (pressed || disabled) && { opacity: disabled ? 0.55 : 0.8 },
              ]}>
              <Text variant="label" tint={selected ? theme.primary : theme.textSecondary}>{LABELS[day]}</Text>
            </Pressable>
          );
        })}
      </View>
      {error ? <Text variant="caption" tint={theme.danger}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: Spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: { minWidth: 48, minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.sm, borderWidth: 1, borderRadius: Radius.pill },
});

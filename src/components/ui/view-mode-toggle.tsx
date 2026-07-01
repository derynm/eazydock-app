import { Pressable, StyleSheet, View } from 'react-native';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { Icon } from './icon';

export type ViewMode = 'cards' | 'table';

type Props = {
  value: ViewMode;
  onChange: (value: ViewMode) => void;
};

export function ViewModeToggle({ value, onChange }: Props) {
  const theme = useTheme();

  return (
    <View
      accessibilityRole="radiogroup"
      style={[styles.track, { backgroundColor: theme.surfaceSunken, borderColor: theme.border }]}>
      <Pressable
        accessibilityRole="radio"
        accessibilityLabel="Card view"
        accessibilityState={{ checked: value === 'cards' }}
        onPress={() => onChange('cards')}
        style={[styles.option, value === 'cards' && { backgroundColor: theme.surface }]}>
        <Icon name="listView" size={18} color={value === 'cards' ? theme.primary : theme.textMuted} />
      </Pressable>
      <Pressable
        accessibilityRole="radio"
        accessibilityLabel="Table view"
        accessibilityState={{ checked: value === 'table' }}
        onPress={() => onChange('table')}
        style={[styles.option, value === 'table' && { backgroundColor: theme.surface }]}>
        <Icon name="tableView" size={18} color={value === 'table' ? theme.primary : theme.textMuted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    padding: 3,
    gap: 2,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  option: {
    width: 38,
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.sm,
  },
});

import { Pressable, StyleSheet, View } from 'react-native';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { Icon, type IconName } from './icon';

export type ViewMode = 'cards' | 'table';

type Props = {
  value: ViewMode;
  onChange: (value: ViewMode) => void;
  cardsIcon?: IconName;
  tableIcon?: IconName;
  cardsLabel?: string;
  tableLabel?: string;
};

export function ViewModeToggle({
  value,
  onChange,
  cardsIcon = 'listView',
  tableIcon = 'tableView',
  cardsLabel = 'Card view',
  tableLabel = 'Table view',
}: Props) {
  const theme = useTheme();

  return (
    <View
      accessibilityRole="radiogroup"
      style={[styles.track, { backgroundColor: theme.surfaceSunken, borderColor: theme.border }]}>
      <Pressable
        accessibilityRole="radio"
        accessibilityLabel={cardsLabel}
        accessibilityState={{ checked: value === 'cards' }}
        onPress={() => onChange('cards')}
        style={[
          styles.option,
          value === 'cards' && styles.optionSelected,
          value === 'cards' && { backgroundColor: theme.surface },
        ]}>
        <Icon name={cardsIcon} size={18} color={value === 'cards' ? theme.primary : theme.textMuted} />
      </Pressable>
      <Pressable
        accessibilityRole="radio"
        accessibilityLabel={tableLabel}
        accessibilityState={{ checked: value === 'table' }}
        onPress={() => onChange('table')}
        style={[
          styles.option,
          value === 'table' && styles.optionSelected,
          value === 'table' && { backgroundColor: theme.surface },
        ]}>
        <Icon name={tableIcon} size={18} color={value === 'table' ? theme.primary : theme.textMuted} />
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
  optionSelected: {
    borderRadius: Radius.sm,
    shadowColor: '#0B1F33',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  option: {
    width: 38,
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.sm,
  },
});

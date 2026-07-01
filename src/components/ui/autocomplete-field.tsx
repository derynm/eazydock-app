import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Radius, Shadow, Spacing } from '@/constants/theme';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useTheme } from '@/hooks/use-theme';

import { Icon, type IconName } from './icon';
import { Text } from './text';
import { TextField } from './text-field';

export type AutocompleteItem = { id: number; label: string; hint?: string };

type Props = {
  label?: string;
  placeholder?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  icon?: IconName;
  autoFocus?: boolean;
  autoCapitalize?: 'none' | 'characters' | 'words' | 'sentences';
  returnKeyType?: 'search' | 'done' | 'next';
  value: string;
  onChangeText: (text: string) => void;
  /** Debounced as the user types. */
  search: (q: string) => Promise<AutocompleteItem[]>;
  onSelect: (item: AutocompleteItem) => void;
  queryKey: string;
  minChars?: number;
  hideNoMatches?: boolean;
  onEndEditing?: () => void;
  onSubmitEditing?: () => void;
};

export function AutocompleteField({
  value,
  onChangeText,
  search,
  onSelect,
  queryKey,
  minChars = 2,
  hideNoMatches = false,
  onEndEditing,
  onSubmitEditing,
  ...field
}: Props) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const debounced = useDebouncedValue(value, 250);
  const term = debounced.trim();
  const active = focused && term.length >= minChars;

  const { data: results = [], isFetching } = useQuery({
    queryKey: ['autocomplete', queryKey, term],
    queryFn: () => search(term),
    enabled: active,
  });

  return (
    <View style={styles.wrap}>
      <TextField
        {...field}
        value={value}
        onChangeText={onChangeText}
        autoCorrect={false}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        onEndEditing={onEndEditing}
        onSubmitEditing={onSubmitEditing}
      />

      {active && (isFetching || results.length > 0 || !hideNoMatches) ? (
        <View style={[styles.menu, { backgroundColor: theme.surface, borderColor: theme.border }, Shadow.md as object]}>
          {isFetching && results.length === 0 ? (
            <View style={styles.msg}>
              <ActivityIndicator size="small" color={theme.primary} />
              <Text variant="caption" color="textMuted">
                Searching…
              </Text>
            </View>
          ) : results.length === 0 && !hideNoMatches ? (
            <View style={styles.msg}>
              <Text variant="caption" color="textMuted">
                No matches
              </Text>
            </View>
          ) : (
            results.slice(0, 8).map((item, i) => (
              <Pressable
                key={item.id}
                onPress={() => {
                  onSelect(item);
                  setFocused(false);
                }}
                style={({ pressed }) => [
                  styles.item,
                  i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border },
                  pressed && { backgroundColor: theme.surfaceSunken },
                ]}>
                <View style={styles.flex}>
                  <Text variant="body" numberOfLines={1}>
                    {item.label}
                  </Text>
                  {item.hint ? (
                    <Text variant="caption" color="textMuted" numberOfLines={1}>
                      {item.hint}
                    </Text>
                  ) : null}
                </View>
                <Icon name="arrowRight" size={16} color={theme.textMuted} />
              </Pressable>
            ))
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.sm, zIndex: 1 },
  menu: {
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  msg: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md, justifyContent: 'center' },
  item: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.md, padding: Spacing.md },
  flex: { flex: 1 },
});

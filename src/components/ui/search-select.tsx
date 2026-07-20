import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { useErrorScrollField } from '@/components/form-error-scroll';
import { Radius, Spacing } from '@/constants/theme';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useTheme } from '@/hooks/use-theme';

import { Icon } from './icon';
import { SearchBar } from './search-bar';
import { Text } from './text';

export type SearchSelectItem = { id: number; label: string; hint?: string };

type Props = {
  label?: string;
  placeholder?: string;
  required?: boolean;
  value: SearchSelectItem | null;
  onChange: (value: SearchSelectItem | null) => void;
  /** Debounced query — return matches for the typed term. */
  search: (q: string) => Promise<SearchSelectItem[]>;
  queryKey: string;
  minChars?: number;
  error?: string;
};

export function SearchSelect({
  label,
  placeholder = 'Search…',
  required,
  value,
  onChange,
  search,
  queryKey,
  minChars = 2,
  error,
}: Props) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState('');
  const debounced = useDebouncedValue(term, 250);
  const errorScrollRef = useErrorScrollField(error);
  const enabled = debounced.trim().length >= minChars;

  const { data: results = [], isFetching } = useQuery({
    queryKey: ['search-select', queryKey, debounced],
    queryFn: () => search(debounced.trim()),
    enabled: open && enabled,
  });

  const close = () => {
    setOpen(false);
    setTerm('');
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
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.trigger,
          { backgroundColor: theme.surface, borderColor: error ? theme.danger : theme.border },
          pressed && { borderColor: theme.primary },
        ]}>
        <Icon name="search" size={18} color={theme.textMuted} />
        <Text variant="body" color={value ? 'text' : 'textMuted'} numberOfLines={1} style={styles.flex}>
          {value?.label ?? placeholder}
        </Text>
        {value ? (
          <Pressable hitSlop={8} onPress={() => onChange(null)}>
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

      <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
        <SafeAreaProvider style={styles.flex}>
          <Pressable style={[styles.scrim, { backgroundColor: theme.scrim }]} onPress={close}>
            <SafeAreaView style={styles.sheetWrap}>
              <Pressable style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={(e) => e.stopPropagation()}>
                {label ? (
                  <Text variant="overline" color="textMuted" style={styles.sheetTitle}>
                    {label}
                  </Text>
                ) : null}
                <SearchBar value={term} onChangeText={setTerm} placeholder={placeholder} />
                <FlatList
                  data={results}
                  keyExtractor={(o) => String(o.id)}
                  keyboardShouldPersistTaps="handled"
                  style={styles.list}
                  ListEmptyComponent={
                    <Text variant="body" color="textMuted" style={styles.empty}>
                      {!enabled ? `Type at least ${minChars} characters` : isFetching ? 'Searching…' : 'No matches'}
                    </Text>
                  }
                  renderItem={({ item }) => {
                    const isSel = item.id === value?.id;
                    return (
                      <Pressable
                        onPress={() => {
                          onChange(item);
                          close();
                        }}
                        style={({ pressed }) => [
                          styles.option,
                          isSel && { backgroundColor: theme.primarySoft },
                          pressed && !isSel && { backgroundColor: theme.surfaceSunken },
                        ]}>
                        <View style={styles.flex}>
                          <Text variant="body" tint={isSel ? theme.primary : theme.text}>
                            {item.label}
                          </Text>
                          {item.hint ? (
                            <Text variant="caption" color="textMuted">
                              {item.hint}
                            </Text>
                          ) : null}
                        </View>
                        {isSel ? <Icon name="check" size={18} color={theme.primary} /> : null}
                      </Pressable>
                    );
                  }}
                />
              </Pressable>
            </SafeAreaView>
          </Pressable>
        </SafeAreaProvider>
      </Modal>
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
  scrim: { flex: 1, justifyContent: 'center', padding: Spacing.xl },
  sheetWrap: { flex: 1, width: '100%', maxWidth: 460, alignSelf: 'center', justifyContent: 'center' },
  sheet: { borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: Spacing.lg, gap: Spacing.md, maxHeight: '80%' },
  sheetTitle: {},
  list: { flexGrow: 0 },
  empty: { paddingVertical: Spacing.lg, textAlign: 'center' },
  option: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md, paddingHorizontal: Spacing.sm, borderRadius: Radius.md },
});

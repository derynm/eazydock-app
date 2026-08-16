import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { useErrorScrollField } from '@/components/form-error-scroll';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { Icon } from './icon';
import { Text } from './text';

export type Option<T extends string | number> = {
  label: string;
  value: T;
  hint?: string;
  hintTone?: 'neutral' | 'success' | 'warning';
};

type Props<T extends string | number> = {
  label?: string;
  value: T | null | undefined;
  options: Option<T>[];
  onChange: (value: T) => void;
  placeholder?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  /** Replaces the default trigger; receives the sheet opener and current option. */
  trigger?: (open: () => void, selected: Option<T> | undefined) => React.ReactNode;
};

export function Select<T extends string | number>({
  label,
  value,
  options,
  onChange,
  placeholder = 'Select…',
  error,
  required,
  disabled,
  trigger,
}: Props<T>) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const errorScrollRef = useErrorScrollField(error);
  const selected = options.find((o) => o.value === value);

  return (
    <View ref={errorScrollRef} style={styles.field}>
      {label && !trigger ? (
        <Text variant="label" color="textSecondary">
          {label}
          {required ? <Text variant="label" tint={theme.danger}> *</Text> : null}
        </Text>
      ) : null}
      {trigger ? (
        trigger(() => setOpen(true), selected)
      ) : (
        <Pressable
          disabled={disabled}
          onPress={() => setOpen(true)}
          style={({ pressed }) => [
            styles.trigger,
            { backgroundColor: theme.surface, borderColor: error ? theme.danger : theme.border },
            pressed && { borderColor: theme.primary },
            disabled && { opacity: 0.5 },
          ]}>
          <Text variant="body" color={selected ? 'text' : 'textMuted'} numberOfLines={1} style={styles.flex}>
            {selected?.label ?? placeholder}
          </Text>
          <Icon name="chevronDown" size={18} color={theme.textMuted} />
        </Pressable>
      )}
      {error ? (
        <Text variant="caption" tint={theme.danger}>
          {error}
        </Text>
      ) : null}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <SafeAreaProvider style={styles.flex}>
          <Pressable style={[styles.scrim, { backgroundColor: theme.scrim }]} onPress={() => setOpen(false)}>
            <SafeAreaView style={styles.sheetWrap}>
              <Pressable
                style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.border }]}
                onPress={(event) => event.stopPropagation()}>
                {label ? (
                  <Text variant="overline" color="textMuted" style={styles.sheetTitle}>
                    {label}
                  </Text>
                ) : null}
                <FlatList
                  data={options}
                  keyExtractor={(o) => String(o.value)}
                  style={[styles.optionList, options.length <= 1 && styles.shortOptionList]}
                  ListEmptyComponent={
                    <Text variant="body" color="textMuted" style={styles.emptyOption}>
                      No options available
                    </Text>
                  }
                  renderItem={({ item }) => {
                    const isSel = item.value === value;
                    return (
                      <Pressable
                        onPress={() => {
                          onChange(item.value);
                          setOpen(false);
                        }}
                        style={({ pressed }) => [
                          styles.option,
                          isSel && { backgroundColor: theme.primarySoft },
                          pressed && !isSel && { backgroundColor: theme.surfaceSunken },
                        ]}>
                        <View style={[styles.flex, styles.optionText]}>
                          <Text variant="body" tint={isSel ? theme.primary : theme.text}>
                            {item.label}
                          </Text>
                          {item.hint ? (
                            <Text
                              variant="caption"
                              tint={item.hintTone === 'warning'
                                ? theme.warning
                                : item.hintTone === 'success'
                                  ? theme.success
                                  : theme.textMuted}>
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
  sheet: { borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: Spacing.lg, maxHeight: '80%' },
  sheetTitle: { marginBottom: Spacing.sm },
  optionList: { flexGrow: 0 },
  shortOptionList: { minHeight: 56 },
  option: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md, paddingHorizontal: Spacing.sm, borderRadius: Radius.md },
  optionText: { gap: 2 },
  emptyOption: { paddingVertical: Spacing.lg, textAlign: 'center' },
});

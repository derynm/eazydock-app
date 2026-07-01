import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { Banner, Button, IconButton, Text } from '@/components/ui';
import { Radius, Shadow, Spacing } from '@/constants/theme';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  onSubmit: () => void;
  submitting?: boolean;
  submitLabel?: string;
  error?: string | null;
  children: ReactNode;
};

export function FormSheet({ visible, onClose, title, subtitle, onSubmit, submitting, submitLabel = 'Save', error, children }: Props) {
  const theme = useTheme();
  const { isTablet } = useResponsive();

  const inner = (
    <View style={[styles.card, { backgroundColor: theme.surface }, isTablet && styles.cardTablet, isTablet && (Shadow.lg as object)]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <View style={styles.flex}>
          <Text variant="subtitle" numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text variant="caption" color="textMuted">
              {subtitle}
            </Text>
          ) : null}
        </View>
        <IconButton name="close" accessibilityLabel="Close" onPress={onClose} color={theme.textSecondary} />
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {error ? <Banner title="Couldn’t save" message={error} tone="danger" /> : null}
        {children}
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: theme.border }]}>
        <Button title="Cancel" variant="ghost" onPress={onClose} />
        <Button title={submitLabel} icon="check" loading={submitting} onPress={onSubmit} />
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent={isTablet}
      presentationStyle={isTablet ? 'overFullScreen' : 'fullScreen'}
      animationType={isTablet ? 'fade' : 'slide'}
      onRequestClose={onClose}>
      <SafeAreaProvider style={styles.flex}>
        {isTablet ? (
          <Pressable style={[styles.scrim, { backgroundColor: theme.scrim }]} onPress={onClose}>
            <Pressable style={styles.tabletWrap} onPress={(e) => e.stopPropagation()}>
              <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>{inner}</KeyboardAvoidingView>
            </Pressable>
          </Pressable>
        ) : (
          <SafeAreaView style={[styles.fullSafe, { backgroundColor: theme.surface }]} edges={['top', 'bottom']}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
              {inner}
            </KeyboardAvoidingView>
          </SafeAreaView>
        )}
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrim: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  tabletWrap: { width: '100%', maxWidth: 560 },
  fullSafe: { flex: 1 },
  card: { flex: 1, overflow: 'hidden' },
  cardTablet: { flex: 0, maxHeight: '88%', borderRadius: Radius.lg },
  header: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  body: { padding: Spacing.lg, gap: Spacing.lg },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});

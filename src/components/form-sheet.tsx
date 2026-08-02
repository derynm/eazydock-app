import { useEffect, useRef, type ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View, type ScrollView } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { FormScrollView } from '@/components/form-error-scroll';
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
  hideCloseButton?: boolean;
  tabletTall?: boolean;
  children: ReactNode;
};

export function FormSheet({ visible, onClose, title, subtitle, onSubmit, submitting, submitLabel = 'Save', error, hideCloseButton = false, tabletTall = false, children }: Props) {
  const theme = useTheme();
  const { isTablet } = useResponsive();
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!error) return;
    const frame = requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: 0, animated: true }));
    return () => cancelAnimationFrame(frame);
  }, [error]);

  const inner = (
    <View style={[styles.card, { backgroundColor: theme.surface }, isTablet && styles.cardTablet, isTablet && tabletTall && styles.cardTabletTall, isTablet && (Shadow.lg as object)]}>
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
        {!hideCloseButton ? <IconButton name="close" accessibilityLabel="Close" onPress={onClose} color={theme.textSecondary} /> : null}
      </View>

      <FormScrollView
        ref={scrollRef}
        style={isTablet && tabletTall ? styles.bodyScroll : undefined}
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {error ? <Banner title="Couldn’t save" message={error} tone="danger" /> : null}
        {children}
      </FormScrollView>

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
          <View style={[styles.scrim, { backgroundColor: theme.scrim }]}>
            <Pressable
              style={StyleSheet.absoluteFill}
              accessibilityRole="button"
              accessibilityLabel="Close form"
              onPress={onClose}
            />
            <View style={[styles.tabletWrap, tabletTall && styles.tabletWrapTall]}>
              <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={tabletTall && styles.flex}>{inner}</KeyboardAvoidingView>
            </View>
          </View>
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
  tabletWrapTall: { height: '88%', maxHeight: 720 },
  fullSafe: { flex: 1 },
  card: { flex: 1, overflow: 'hidden' },
  cardTablet: { flex: 0, maxHeight: '88%', borderRadius: Radius.lg },
  cardTabletTall: { flex: 1, maxHeight: '100%' },
  bodyScroll: { flex: 1 },
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

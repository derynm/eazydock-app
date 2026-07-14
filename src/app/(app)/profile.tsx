import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ScrollView, StyleSheet, View } from 'react-native';

import { resetPasswordSchema, type ResetPasswordForm } from '@/api/schemas';
import { toApiError } from '@/api/client';
import { useActiveCompany, useSession } from '@/auth/session';
import { FormSheet } from '@/components/form-sheet';
import { Screen } from '@/components/screen';
import { Button, Card, Divider, Icon, KeyValue, Segmented, Text, TextField } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme, useThemePreference, type ThemeMode } from '@/hooks/use-theme';
import { zodResolver } from '@/lib/zod-resolver';

const themeOptions: { value: ThemeMode; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

const emptyResetPassword: ResetPasswordForm = {
  old_password: '',
  password: '',
  password_confirmation: '',
};

export default function ProfileScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { mode, scheme, setMode, toggleScheme } = useThemePreference();
  const { user, selectedBuilding, resetPassword, logout } = useSession();
  const activeCompany = useActiveCompany();
  const [resetOpen, setResetOpen] = useState(false);
  const [resetTopError, setResetTopError] = useState<string | null>(null);

  const { control, handleSubmit, reset, setError } = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: emptyResetPassword,
  });

  const resetMutation = useMutation({
    mutationFn: resetPassword,
    onMutate: () => setResetTopError(null),
    onSuccess: () => {
      reset(emptyResetPassword);
      setResetOpen(false);
      router.replace('/login');
    },
    onError: (err) => {
      const api = toApiError(err);
      setResetTopError(api.status === 422 ? null : api.message);
      Object.entries(api.errors).forEach(([field, messages]) => {
        setError(field as keyof ResetPasswordForm, { message: messages[0] });
      });
    },
  });

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  const closeResetPassword = () => {
    if (resetMutation.isPending) return;
    setResetOpen(false);
    setResetTopError(null);
    reset(emptyResetPassword);
  };

  return (
    <>
      <Screen title="Profile" subtitle="Account and appearance">
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Card style={styles.hero}>
            <View style={[styles.avatar, { backgroundColor: theme.primarySoft }]}>
              <Icon name="user" size={42} color={theme.primary} />
            </View>
            <View style={styles.heroText}>
              <Text variant="title" center numberOfLines={1}>
                {user?.name ?? 'Signed in'}
              </Text>
              <Text variant="body" color="textSecondary" center numberOfLines={1}>
                {user?.email ?? ''}
              </Text>
            </View>
          </Card>

          <Card>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: theme.primarySoft }]}>
                <Icon name={scheme === 'dark' ? 'moon' : 'sun'} size={20} color={theme.primary} />
              </View>
              <View style={styles.sectionTitle}>
                <Text variant="bodyStrong">Appearance</Text>
                <Text variant="caption" color="textMuted">
                  {scheme === 'dark' ? 'Dark mode is active' : 'Light mode is active'}
                </Text>
              </View>
              <Button
                title={scheme === 'dark' ? 'Light' : 'Dark'}
                icon={scheme === 'dark' ? 'sun' : 'moon'}
                variant="secondary"
                size="sm"
                onPress={toggleScheme}
              />
            </View>
            <Segmented options={themeOptions} value={mode} onChange={setMode} />
          </Card>

          <Card>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: theme.warningSoft }]}>
                <Icon name="lock" size={20} color={theme.warning} />
              </View>
              <View style={styles.sectionTitle}>
                <Text variant="bodyStrong">Security</Text>
                <Text variant="caption" color="textMuted">
                  Resetting your password signs you out
                </Text>
              </View>
              <Button title="Reset" icon="lock" variant="secondary" size="sm" onPress={() => setResetOpen(true)} />
            </View>
          </Card>

          <Card>
            <KeyValue label="Company" value={activeCompany?.name ?? '—'} icon="building" />
            <Divider />
            <KeyValue label="Building" value={selectedBuilding?.name ?? 'Not selected'} icon="buildings" />
            <Divider />
            <KeyValue label="Email" value={user?.email ?? '—'} icon="mail" />
          </Card>

          <Button title="Sign out" icon="logout" variant="ghost" onPress={handleLogout} />
        </ScrollView>
      </Screen>

      <FormSheet
        visible={resetOpen}
        onClose={closeResetPassword}
        title="Reset password"
        subtitle="You will return to Login after saving"
        onSubmit={handleSubmit((values) => resetMutation.mutate(values))}
        submitting={resetMutation.isPending}
        submitLabel="Reset password"
        error={resetTopError}>
        <Controller
          control={control}
          name="old_password"
          render={({ field, fieldState }) => (
            <TextField
              label="Current password"
              required
              secure
              autoCapitalize="none"
              textContentType="password"
              value={field.value}
              onChangeText={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="password"
          render={({ field, fieldState }) => (
            <TextField
              label="New password"
              required
              secure
              autoCapitalize="none"
              textContentType="newPassword"
              value={field.value}
              onChangeText={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="password_confirmation"
          render={({ field, fieldState }) => (
            <TextField
              label="Confirm new password"
              required
              secure
              autoCapitalize="none"
              textContentType="newPassword"
              value={field.value}
              onChangeText={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />
      </FormSheet>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, gap: Spacing.lg },
  hero: { alignItems: 'center', gap: Spacing.md },
  avatar: { width: 84, height: 84, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center' },
  heroText: { alignSelf: 'stretch', gap: 2 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.md },
  sectionIcon: { width: 38, height: 38, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { flex: 1, gap: 1 },
});

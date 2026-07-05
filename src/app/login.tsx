import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { toApiError, type ApiError } from '@/api/client';
import { BrandMark } from '@/components/brand';
import { Banner, Button, Icon, Text, TextField } from '@/components/ui';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { useSession } from '@/auth/session';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';

const HIGHLIGHTS = [
  { icon: 'transactions', title: 'Live dock board', desc: 'Track every vehicle on site in real time.' },
  { icon: 'bookings', title: 'Bookings & check-in', desc: 'Manage arrivals from your phone or tablet.' },
  { icon: 'occupancy', title: 'Occupancy at a glance', desc: 'KPIs and overstay alerts on one dashboard.' },
] as const;

export default function Login() {
  const theme = useTheme();
  const router = useRouter();
  const { login } = useSession();
  const { isWide } = useResponsive();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<ApiError | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      router.replace('/select-building');
    } catch (e) {
      setError(toApiError(e));
    } finally {
      setSubmitting(false);
    }
  };

  const form = (
    <View style={styles.formCard}>
      <View style={styles.formHeader}>
        <BrandMark size={48} />
        <Text variant="title">Welcome back</Text>
        <Text variant="body" color="textSecondary">
          Sign in with your eazydock dashboard credentials.
        </Text>
      </View>

      {error && error.status !== 422 ? (
        <Banner title="Couldn’t sign in" message={error.message} tone="danger" />
      ) : null}

      <View style={styles.fields}>
        <TextField
          label="Email"
          icon="mail"
          placeholder="you@company.com"
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          textContentType="username"
          value={email}
          onChangeText={setEmail}
          error={error?.field('email')}
          required
        />
        <TextField
          label="Password"
          icon="lock"
          placeholder="••••••••"
          secure
          autoComplete="password"
          textContentType="password"
          value={password}
          onChangeText={setPassword}
          onSubmitEditing={onSubmit}
          returnKeyType="go"
          error={error?.field('password')}
          required
        />
      </View>

      <Button title="Sign in" icon="arrowRight" loading={submitting} onPress={onSubmit} fullWidth size="lg" />
      <Text variant="caption" color="textMuted" center>
        Trouble signing in? Contact your administrator.
      </Text>
    </View>
  );

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      {isWide ? (
        <View style={[styles.hero, { backgroundColor: Brand[700] }]}>
          <SafeAreaView style={styles.heroInner}>
            <View style={styles.heroBrand}>
              <BrandMark size={44} />
              <Text variant="subtitle" tint="#FFFFFF">
                eazydock
              </Text>
            </View>
            <View style={styles.heroBody}>
              <Text variant="display" tint="#FFFFFF" style={styles.heroTitle}>
                Run the dock from anywhere.
              </Text>
              <Text variant="body" tint="#FFFFFF" style={styles.heroSub}>
                The eazydock operations app brings your parking dashboard to phone and tablet.
              </Text>
              <View style={styles.highlights}>
                {HIGHLIGHTS.map((h) => (
                  <View key={h.title} style={styles.highlight}>
                    <View style={styles.highlightIcon}>
                      <Icon name={h.icon} size={20} color="#FFFFFF" />
                    </View>
                    <View style={styles.highlightText}>
                      <Text variant="bodyStrong" tint="#FFFFFF">
                        {h.title}
                      </Text>
                      <Text variant="caption" tint="#FFFFFF" style={styles.heroSub}>
                        {h.desc}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
            <Text variant="caption" tint="#FFFFFF" style={styles.heroSub}>
              © {new Date().getFullYear()} eazydock
            </Text>
          </SafeAreaView>
        </View>
      ) : null}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.formSide}>
        <SafeAreaView style={styles.formSafe}>
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            {form}
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row' },
  hero: { flex: 1.1 },
  heroInner: { flex: 1, padding: Spacing.xxl, justifyContent: 'space-between' },
  heroBrand: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  heroBody: { gap: Spacing.lg, maxWidth: 460 },
  heroTitle: { lineHeight: 42 },
  heroSub: { opacity: 0.8 },
  highlights: { gap: Spacing.lg, marginTop: Spacing.sm },
  highlight: { flexDirection: 'row', gap: Spacing.md, alignItems: 'center' },
  highlightIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  highlightText: { flex: 1, gap: 2 },
  formSide: { flex: 1 },
  formSafe: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: Spacing.xl },
  formCard: { width: '100%', maxWidth: 400, alignSelf: 'center', gap: Spacing.xl },
  formHeader: { gap: Spacing.sm, alignItems: 'flex-start' },
  fields: { gap: Spacing.lg },
});

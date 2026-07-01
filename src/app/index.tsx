import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useSession } from '@/auth/session';
import { useTheme } from '@/hooks/use-theme';

export default function Index() {
  const { status } = useSession();
  const theme = useTheme();

  if (status === 'loading') {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  return <Redirect href={status === 'authed' ? '/dashboard' : '/login'} />;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});

import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useSession } from '@/auth/session';
import { useTheme } from '@/hooks/use-theme';

export default function Index() {
  const { status, selectedBuilding } = useSession();
  const theme = useTheme();

  if (status === 'loading') {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  if (status === 'authed') {
    return <Redirect href={selectedBuilding ? '/dashboard' : '/select-building'} />;
  }
  return <Redirect href="/login" />;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});

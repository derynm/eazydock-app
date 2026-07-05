import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { lookupBuildings } from '@/api/lookups';
import { BrandMark } from '@/components/brand';
import { Icon, Skeleton, Text } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useSession } from '@/auth/session';
import { useTheme } from '@/hooks/use-theme';

export default function SelectBuildingScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { selectBuilding, selectedBuilding } = useSession();

  const { data: buildings = [], isLoading } = useQuery({
    queryKey: ['lookup-buildings'],
    queryFn: lookupBuildings,
  });

  const handleSelect = async (b: { id: number; name: string }) => {
    await selectBuilding(b);
    router.replace('/dashboard');
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <BrandMark size={48} />
            <Text variant="title" style={styles.title}>Select your building</Text>
            <Text variant="body" tint={theme.textMuted} style={styles.subtitle}>
              Choose the building you're working at today. You can change it anytime from the sidebar.
            </Text>
          </View>

          <View style={styles.list}>
            {isLoading
              ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} height={72} width="100%" />)
              : buildings.map((b) => {
                  const active = selectedBuilding?.id === b.id;
                  return (
                    <Pressable
                      key={b.id}
                      onPress={() => handleSelect(b)}
                      style={({ pressed }) => [
                        styles.card,
                        {
                          backgroundColor: active ? theme.primarySoft : theme.surface,
                          borderColor: active ? theme.primary : theme.border,
                        },
                        pressed && { opacity: 0.8 },
                      ]}>
                      <View style={[styles.iconWrap, { backgroundColor: active ? theme.primary : theme.neutralSoft }]}>
                        <Icon name="buildings" size={22} color={active ? '#fff' : theme.textMuted} />
                      </View>
                      <Text variant="bodyStrong" tint={active ? theme.primary : theme.text} style={styles.cardLabel}>
                        {b.name}
                      </Text>
                      {active ? <Icon name="checkCircle" size={20} color={theme.primary} /> : null}
                    </Pressable>
                  );
                })}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  content: { padding: Spacing.xl, gap: Spacing.xl },
  header: { alignItems: 'center', gap: Spacing.md, paddingTop: Spacing.xl },
  title: { textAlign: 'center' },
  subtitle: { textAlign: 'center', lineHeight: 22 },
  list: { gap: Spacing.md },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
  },
  iconWrap: { width: 44, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  cardLabel: { flex: 1 },
});

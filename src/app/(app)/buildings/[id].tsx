import { useLocalSearchParams, useRouter } from 'expo-router';

import { Screen } from '@/components/screen';
import { BuildingDetail } from '@/features/buildings/building-detail';

export default function BuildingDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <Screen title="Building" onBack={() => router.back()}>
      <BuildingDetail id={Number(id)} onDeleted={() => router.back()} />
    </Screen>
  );
}

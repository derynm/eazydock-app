import { useLocalSearchParams, useRouter } from 'expo-router';

import { Screen } from '@/components/screen';
import { DriverDetail } from '@/features/drivers/driver-detail';

export default function DriverDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <Screen title="Driver" onBack={() => router.back()}>
      <DriverDetail id={Number(id)} onDeleted={() => router.back()} />
    </Screen>
  );
}

import { useLocalSearchParams, useRouter } from 'expo-router';

import { Screen } from '@/components/screen';
import { VehicleDetail } from '@/features/vehicles/vehicle-detail';

export default function VehicleDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <Screen title="Vehicle" onBack={() => router.back()}>
      <VehicleDetail id={Number(id)} onDeleted={() => router.back()} />
    </Screen>
  );
}

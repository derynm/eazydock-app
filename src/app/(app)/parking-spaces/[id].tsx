import { useLocalSearchParams, useRouter } from 'expo-router';

import { Screen } from '@/components/screen';
import { ParkingSpaceDetail } from '@/features/parking-spaces/parking-space-detail';

export default function ParkingSpaceDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <Screen title="Parking Space" onBack={() => router.back()}>
      <ParkingSpaceDetail id={Number(id)} onDeleted={() => router.back()} />
    </Screen>
  );
}

import { useLocalSearchParams, useRouter } from 'expo-router';

import { Screen } from '@/components/screen';
import { ParkingAreaDetail } from '@/features/parking-areas/parking-area-detail';

export default function ParkingAreaDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <Screen title="Parking Area" onBack={() => router.back()}>
      <ParkingAreaDetail id={Number(id)} onDeleted={() => router.back()} />
    </Screen>
  );
}

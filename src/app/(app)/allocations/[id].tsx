import { useLocalSearchParams, useRouter } from 'expo-router';

import { Screen } from '@/components/screen';
import { AllocationDetail } from '@/features/allocations/allocation-detail';

export default function AllocationDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <Screen title="Allocation" onBack={() => router.back()}>
      <AllocationDetail id={Number(id)} onDeleted={() => router.back()} />
    </Screen>
  );
}

import { useLocalSearchParams, useRouter } from 'expo-router';

import { Screen } from '@/components/screen';
import { IncidentDetail } from '@/features/incidents/incident-detail';

export default function IncidentDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <Screen title="Incident" onBack={() => router.back()}>
      <IncidentDetail id={Number(id)} />
    </Screen>
  );
}

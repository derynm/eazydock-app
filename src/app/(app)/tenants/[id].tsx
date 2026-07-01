import { useLocalSearchParams, useRouter } from 'expo-router';

import { Screen } from '@/components/screen';
import { TenantDetail } from '@/features/tenants/tenant-detail';

export default function TenantDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <Screen title="Tenant" onBack={() => router.back()}>
      <TenantDetail id={Number(id)} onDeleted={() => router.back()} />
    </Screen>
  );
}

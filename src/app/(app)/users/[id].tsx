import { useLocalSearchParams, useRouter } from 'expo-router';

import { Screen } from '@/components/screen';
import { UserDetail } from '@/features/users/user-detail';

export default function UserDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <Screen title="User" onBack={() => router.back()}>
      <UserDetail id={Number(id)} />
    </Screen>
  );
}

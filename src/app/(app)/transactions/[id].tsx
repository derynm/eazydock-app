import { useLocalSearchParams, useRouter } from 'expo-router';

import { Screen } from '@/components/screen';
import { TransactionDetail } from '@/features/transactions/transaction-detail';

export default function TransactionDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <Screen title="Transaction" onBack={() => router.back()}>
      <TransactionDetail id={Number(id)} />
    </Screen>
  );
}

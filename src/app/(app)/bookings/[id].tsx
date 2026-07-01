import { useLocalSearchParams, useRouter } from 'expo-router';

import { Screen } from '@/components/screen';
import { BookingDetail } from '@/features/bookings/booking-detail';

export default function BookingDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <Screen title="Booking" onBack={() => router.back()}>
      <BookingDetail id={Number(id)} onChanged={() => {}} />
    </Screen>
  );
}

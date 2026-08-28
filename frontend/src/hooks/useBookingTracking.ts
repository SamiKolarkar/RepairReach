import { useQuery } from '@tanstack/react-query';
import { getBookingByReference } from '@/api/services';
import { BookingTrackingResponse } from '@/api/types';

export function useBookingTracking(publicReference: string | undefined) {
  return useQuery<BookingTrackingResponse>({
    queryKey: ['booking-tracking', publicReference],
    queryFn: () => {
      if (!publicReference) throw new Error('Public Reference is required');
      return getBookingByReference(publicReference);
    },
    enabled: Boolean(publicReference),
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return 15000;
      // Stop polling once completed or cancelled
      if (data.jobStatus === 'COMPLETED' || data.jobStatus === 'UNABLE_TO_SERVE' || data.bookingState === 'CANCELLED') {
        return false;
      }
      return 15000; // Poll every 15s during active states
    },
    staleTime: 1000 * 5,
  });
}

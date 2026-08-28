import { useQuery } from '@tanstack/react-query';
import { getAvailabilitySlots } from '@/api/services';
import { AvailabilitySlotsResponse } from '@/api/types';

export function useAvailability(serviceId: string | undefined, date: string | undefined) {
  return useQuery<AvailabilitySlotsResponse>({
    queryKey: ['availability-slots', serviceId, date],
    queryFn: () => {
      if (!serviceId || !date) {
        throw new Error('Service ID and Date are required');
      }
      return getAvailabilitySlots(serviceId, date);
    },
    enabled: Boolean(serviceId && date),
    staleTime: 1000 * 30, // 30 seconds
    retry: 1,
  });
}

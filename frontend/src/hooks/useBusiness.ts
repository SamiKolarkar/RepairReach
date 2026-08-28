import { useQuery } from '@tanstack/react-query';
import { getBusinessProfile } from '@/api/services';
import { BusinessProfile } from '@/api/types';

export function useBusiness() {
  return useQuery<BusinessProfile>({
    queryKey: ['business-profile'],
    queryFn: getBusinessProfile,
    staleTime: 1000 * 60 * 15, // 15 minutes
    retry: 2,
  });
}

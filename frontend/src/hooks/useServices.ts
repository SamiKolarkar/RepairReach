import { useQuery } from '@tanstack/react-query';
import { getServices } from '@/api/services';
import { ServiceOffering } from '@/api/types';

export function useServices() {
  return useQuery<ServiceOffering[]>({
    queryKey: ['services'],
    queryFn: getServices,
    staleTime: 1000 * 60 * 10, // 10 minutes
    retry: 2,
  });
}

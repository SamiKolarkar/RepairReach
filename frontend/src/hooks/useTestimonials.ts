import { useQuery } from '@tanstack/react-query';
import { getTestimonials } from '@/api/services';
import { Testimonial } from '@/api/types';

export function useTestimonials() {
  return useQuery<Testimonial[]>({
    queryKey: ['testimonials'],
    queryFn: getTestimonials,
    staleTime: 1000 * 60 * 15,
    retry: 1,
  });
}

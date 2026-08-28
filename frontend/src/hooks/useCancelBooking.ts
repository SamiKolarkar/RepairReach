import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cancelBooking } from '@/api/services';
import { CancelBookingRequest, CancelBookingResponse, ProblemDetails } from '@/api/types';

export function useCancelBooking() {
  const queryClient = useQueryClient();

  return useMutation<
    CancelBookingResponse,
    ProblemDetails,
    { publicReference: string; payload: CancelBookingRequest; idempotencyKey?: string }
  >({
    mutationFn: ({ publicReference, payload, idempotencyKey }) =>
      cancelBooking(publicReference, payload, idempotencyKey),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['booking-tracking', variables.publicReference] });
    },
  });
}

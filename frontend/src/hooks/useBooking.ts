import { useMutation } from '@tanstack/react-query';
import { createBooking } from '@/api/services';
import { CreateBookingRequest, BookingConfirmationResponse, ProblemDetails } from '@/api/types';

export function useBooking() {
  return useMutation<
    BookingConfirmationResponse,
    ProblemDetails,
    { payload: CreateBookingRequest; idempotencyKey: string }
  >({
    mutationFn: ({ payload, idempotencyKey }) => createBooking(payload, idempotencyKey),
  });
}

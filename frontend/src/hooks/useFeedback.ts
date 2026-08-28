import { useMutation } from '@tanstack/react-query';
import { submitFeedback } from '@/api/services';
import { SubmitFeedbackRequest, FeedbackResponse, ProblemDetails } from '@/api/types';

export function useFeedback() {
  return useMutation<
    FeedbackResponse,
    ProblemDetails,
    { jobReference: string; payload: SubmitFeedbackRequest; idempotencyKey?: string }
  >({
    mutationFn: ({ jobReference, payload, idempotencyKey }) =>
      submitFeedback(jobReference, payload, idempotencyKey),
  });
}

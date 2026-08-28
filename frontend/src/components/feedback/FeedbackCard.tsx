import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StarRating } from '@/components/ui/StarRating';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { GoogleReviewPrompt } from './GoogleReviewPrompt';
import { useFeedback } from '@/hooks/useFeedback';
import { useIdempotencyKey } from '@/hooks/useIdempotencyKey';
import { feedbackFormInputSchema } from '@/api/schemas';
import { ProblemDetails } from '@/api/types';

export interface FeedbackCardProps {
  jobReference: string;
  feedbackToken?: string;
  onSubmittedSuccess?: () => void;
}

export const FeedbackCard: React.FC<FeedbackCardProps> = ({
  jobReference,
  feedbackToken,
  onSubmittedSuccess,
}) => {
  const navigate = useNavigate();
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [ratingError, setRatingError] = useState<string>('');
  const [generalError, setGeneralError] = useState<string>('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [googleReviewUrl, setGoogleReviewUrl] = useState<string | undefined>();

  const { idempotencyKey } = useIdempotencyKey();
  const feedbackMutation = useFeedback();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRatingError('');
    setGeneralError('');

    const validation = feedbackFormInputSchema.safeParse({
      rating,
      comment: comment.trim() || undefined,
      feedbackToken,
    });

    if (!validation.success) {
      const issue = validation.error.issues.find((i) => i.path[0] === 'rating');
      if (issue) {
        setRatingError(issue.message);
      }
      return;
    }

    try {
      const result = await feedbackMutation.mutateAsync({
        jobReference: jobReference || 'job-general',
        payload: {
          rating: validation.data.rating,
          comment: validation.data.comment,
          feedbackToken,
        },
        idempotencyKey,
      });

      setIsSubmitted(true);
      if (result.googleReviewUrl) {
        setGoogleReviewUrl(result.googleReviewUrl);
      }
      onSubmittedSuccess?.();
    } catch (err: unknown) {
      const problem = err as ProblemDetails;
      setGeneralError(problem.detail || 'Failed to submit feedback. Please try again.');
    }
  };

  const handleSkip = () => {
    navigate('/');
  };

  if (isSubmitted) {
    return (
      <div className="w-full max-w-md bg-surface-container-lowest rounded-xl shadow-sm p-6 md:p-8 flex flex-col items-center text-center space-y-6">
        <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center">
          <span
            className="material-symbols-outlined text-4xl"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            check_circle
          </span>
        </div>
        <div>
          <h2 className="font-h2 text-h2 text-on-surface mb-2">Thank You!</h2>
          <p className="font-body-lg text-body-lg text-on-surface-variant">
            Your review helps us maintain the highest standard of repair service in Solapur.
          </p>
        </div>

        <GoogleReviewPrompt reviewUrl={googleReviewUrl} className="w-full" />

        <Button variant="primary" className="w-full" onClick={() => navigate('/')}>
          Return to Home
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md bg-surface-container-lowest rounded-xl shadow-sm p-6 md:p-8 flex flex-col items-center text-center">
      <h1 className="font-h2 text-h2 text-on-surface mb-sm">Rate Your Experience</h1>
      <p className="font-body-lg text-body-lg text-on-surface-variant mb-xl">
        How was your repair service today?
      </p>

      {generalError && (
        <div className="w-full mb-6 text-left">
          <Alert variant="error" title="Feedback Error">
            {generalError}
          </Alert>
        </div>
      )}

      <form onSubmit={handleSubmit} className="w-full">
        {/* Star Rating */}
        <div className="mb-xl w-full">
          <StarRating
            value={rating}
            onChange={(val) => {
              setRating(val);
              if (ratingError) setRatingError('');
            }}
            size="lg"
          />
          {ratingError && (
            <p role="alert" className="text-xs text-error font-medium mt-2 flex items-center justify-center gap-1">
              <span className="material-symbols-outlined text-sm">error</span>
              {ratingError}
            </p>
          )}
        </div>

        {/* Optional Comment Area */}
        <div className="w-full mb-xl text-left">
          <Textarea
            id="feedback-comment"
            name="feedback-comment"
            label="Tell us more (optional)"
            placeholder="What did we do well? What could we improve?"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            maxLength={1000}
            currentLength={comment.length}
          />
        </div>

        {/* Submit & Skip Buttons */}
        <Button
          type="submit"
          variant="pill"
          className="w-full"
          isLoading={feedbackMutation.isPending}
          rightIcon={
            <span
              className="material-symbols-outlined"
              style={{ fontVariationSettings: "'FILL' 0" }}
            >
              send
            </span>
          }
        >
          Submit Feedback
        </Button>

        <button
          type="button"
          onClick={handleSkip}
          className="mt-4 w-full h-[56px] min-h-[48px] bg-transparent text-primary font-button text-button rounded-full hover:bg-surface-container-low transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-primary focus:outline-none active:scale-[0.98] transform"
        >
          Skip
        </button>
      </form>
    </div>
  );
};

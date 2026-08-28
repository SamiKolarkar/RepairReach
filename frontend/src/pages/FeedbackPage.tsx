import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { FeedbackCard } from '@/components/feedback/FeedbackCard';

export const FeedbackPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const jobReference = searchParams.get('jobReference') || searchParams.get('ref') || 'general';
  const feedbackToken = searchParams.get('token') || undefined;

  return (
    <main className="flex-grow pt-12 pb-12 px-margin-mobile md:px-lg max-w-[1200px] mx-auto w-full flex flex-col items-center justify-center">
      <FeedbackCard jobReference={jobReference} feedbackToken={feedbackToken} />
    </main>
  );
};

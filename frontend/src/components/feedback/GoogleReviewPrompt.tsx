import React from 'react';
import { Button } from '@/components/ui/Button';

export interface GoogleReviewPromptProps {
  reviewUrl?: string;
  className?: string;
}

export const GoogleReviewPrompt: React.FC<GoogleReviewPromptProps> = ({
  reviewUrl = 'https://search.google.com/local/writereview?placeid=ChIJRepairReachSolapur',
  className = '',
}) => {
  return (
    <div
      className={`bg-surface-container-lowest rounded-xl p-6 border border-primary-container/20 shadow-level-1 text-center space-y-3 ${className}`}
    >
      <div className="w-12 h-12 mx-auto rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
        <span className="material-symbols-outlined text-2xl">rate_review</span>
      </div>
      <h3 className="font-h3 text-h3 text-on-surface">Share on Google Reviews</h3>
      <p className="text-sm text-on-surface-variant max-w-md mx-auto">
        Help other Solapur residents find dependable home appliance repairs by leaving a quick review
        on Google.
      </p>
      <div className="pt-2">
        <a href={reviewUrl} target="_blank" rel="noopener noreferrer" className="inline-block">
          <Button
            variant="outline"
            leftIcon={<span className="material-symbols-outlined text-[20px] text-amber-500">star</span>}
            rightIcon={<span className="material-symbols-outlined text-[18px]">open_in_new</span>}
          >
            Review us on Google
          </Button>
        </a>
      </div>
    </div>
  );
};

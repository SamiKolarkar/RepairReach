import React from 'react';
import { Link } from 'react-router-dom';
import { useTestimonials } from '@/hooks/useTestimonials';
import { Card } from '@/components/ui/Card';
import { StarRating } from '@/components/ui/StarRating';
import { Button } from '@/components/ui/Button';
import { GoogleReviewPrompt } from '@/components/feedback/GoogleReviewPrompt';

export const TestimonialsPage: React.FC = () => {
  const { data: testimonials, isLoading } = useTestimonials();

  return (
    <div className="max-w-[1200px] mx-auto px-margin-mobile py-8 md:py-12 text-left space-y-8">
      {/* Header */}
      <div className="max-w-2xl">
        <h1 className="font-h1 text-3xl sm:text-4xl font-extrabold text-on-surface mb-2">
          Verified Customer Reviews
        </h1>
        <p className="font-body-lg text-base sm:text-lg text-on-surface-variant leading-relaxed">
          Real feedback from homeowners across Solapur who trusted RepairReach for their appliance repairs.
        </p>
      </div>

      {/* Reviews Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-surface p-6 rounded-xl border border-surface-container animate-pulse space-y-3">
              <div className="h-4 bg-slate-200 rounded w-28" />
              <div className="h-4 bg-slate-200 rounded w-full" />
              <div className="h-4 bg-slate-200 rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : !testimonials || testimonials.length === 0 ? (
        <div className="py-16 text-center bg-surface rounded-xl border border-surface-container space-y-3">
          <span className="material-symbols-outlined text-5xl text-outline">rate_review</span>
          <h3 className="font-h3 text-xl font-bold text-on-surface">No Reviews Published Yet</h3>
          <p className="text-sm text-on-surface-variant max-w-md mx-auto">
            We are currently collecting verified customer reviews for our Solapur operations. If you
            recently used our service, please share your feedback.
          </p>
          <div className="pt-2">
            <Link to="/feedback">
              <Button size="sm" variant="primary">
                Leave a Review
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((item) => (
            <Card key={item.id} variant="surface" className="p-6 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <StarRating value={item.rating} readOnly size="sm" />
                <p className="text-sm text-slate-700 italic leading-relaxed">
                  "{item.reviewText}"
                </p>
              </div>

              <div className="pt-3 border-t border-surface-container flex items-center justify-between text-xs text-on-surface-variant">
                <div>
                  <span className="font-bold text-on-surface block text-sm">{item.customerName}</span>
                  <span className="text-slate-500">{item.location || 'Solapur'}</span>
                </div>
                <span className="bg-surface-container px-2.5 py-1 rounded text-primary font-semibold">
                  {item.serviceType}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Google Reviews CTA */}
      <div className="pt-8">
        <GoogleReviewPrompt />
      </div>
    </div>
  );
};

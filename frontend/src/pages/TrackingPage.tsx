import React, { useState } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { useBookingTracking } from '@/hooks/useBookingTracking';
import { ConfirmationHero } from '@/components/tracking/ConfirmationHero';
import { BookingSummaryCard } from '@/components/tracking/BookingSummaryCard';
import { StatusTimeline } from '@/components/tracking/StatusTimeline';
import { CancelModal } from '@/components/tracking/CancelModal';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Alert } from '@/components/ui/Alert';
import { BookingConfirmationResponse } from '@/api/types';

export const TrackingPage: React.FC = () => {
  const { publicReference } = useParams<{ publicReference: string }>();
  const location = useLocation();
  const confirmationState = location.state?.confirmation as BookingConfirmationResponse | undefined;

  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  const {
    data: trackingData,
    isLoading,
    error,
    refetch,
  } = useBookingTracking(publicReference);

  // Fallback to initial confirmation state if query is in flight
  const customerName =
    trackingData?.customerName || confirmationState?.customer.fullName || 'Valued Customer';
  const customerPhone =
    trackingData?.customerPhone || confirmationState?.customer.phoneNumber || '';
  const serviceName =
    trackingData?.serviceName || confirmationState?.service.serviceName || 'Appliance Repair';
  const scheduledDate =
    trackingData?.scheduledDate || confirmationState?.scheduledSlot.date || '';
  const scheduledStartTime =
    trackingData?.scheduledStartTime || confirmationState?.scheduledSlot.startTime || '';
  const scheduledEndTime =
    trackingData?.scheduledEndTime || confirmationState?.scheduledSlot.endTime || '';
  const locationAddress =
    trackingData?.serviceLocation || confirmationState?.serviceLocation || '';
  const problemDescription =
    trackingData?.problemDescription || confirmationState?.problemDescription || '';
  const bookingState = trackingData?.bookingState || confirmationState?.status || 'CONFIRMED';
  const jobStatus = trackingData?.jobStatus || 'SCHEDULED';
  const canCancel = trackingData?.canCancel ?? (bookingState !== 'CANCELLED');
  const canCancelWithoutCharge = trackingData?.canCancelWithoutCharge ?? true;
  const visitingChargeAmount = trackingData?.visitingChargeAmount ?? 299;
  const isCancelled = bookingState === 'CANCELLED';
  const isCompleted = jobStatus === 'COMPLETED';

  if (isLoading && !confirmationState) {
    return (
      <div className="flex-grow flex items-center justify-center p-8">
        <LoadingSpinner size="lg" label="Retrieving booking details..." />
      </div>
    );
  }

  if (error && !confirmationState && !trackingData) {
    return (
      <div className="flex-grow flex items-center justify-center p-margin-mobile">
        <div className="w-full max-w-md bg-surface-container-lowest p-8 rounded-xl shadow-level-1 border border-outline-variant/30 text-center space-y-4">
          <span className="material-symbols-outlined text-5xl text-error">search_off</span>
          <h2 className="font-h2 text-2xl font-bold text-on-surface">Booking Not Found</h2>
          <p className="text-sm text-on-surface-variant">
            We could not locate any booking matching reference{' '}
            <span className="font-mono font-bold text-primary">{publicReference}</span>.
          </p>
          <div className="pt-2 flex gap-3 justify-center">
            <Link to="/">
              <Button variant="primary">Return Home</Button>
            </Link>
            <Link to="/contact">
              <Button variant="outline">Contact Support</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="flex-grow flex items-center justify-center p-margin-mobile md:p-lg">
      <div className="w-full max-w-2xl bg-surface-container-lowest rounded-xl shadow-level-2 p-md md:p-lg border border-surface-container-high relative overflow-hidden">
        {/* Decorative Top Accent Bar */}
        <div
          className={`absolute top-0 left-0 w-full h-2 ${
            isCancelled ? 'bg-error' : 'bg-primary-container'
          }`}
        />

        {/* Hero Section */}
        <ConfirmationHero
          title={isCancelled ? 'Booking Cancelled' : 'Booking Confirmed'}
          subtitle={
            isCancelled
              ? 'This service booking has been cancelled.'
              : 'Your repair request has been successfully scheduled.'
          }
          isCancelled={isCancelled}
        />

        {/* Real-time Status Timeline */}
        <StatusTimeline
          jobStatus={jobStatus}
          bookingState={bookingState}
          technicianName={trackingData?.technician?.technicianName}
          technicianPhone={trackingData?.technician?.technicianPhone}
        />

        {/* Summary Card */}
        <BookingSummaryCard
          publicReference={publicReference || ''}
          customerName={customerName}
          customerPhone={customerPhone}
          serviceName={serviceName}
          scheduledDate={scheduledDate}
          scheduledStartTime={scheduledStartTime}
          scheduledEndTime={scheduledEndTime}
          locationAddress={locationAddress}
          problemDescription={problemDescription}
        />

        {/* Cancellation CTA if applicable */}
        {!isCancelled && !isCompleted && canCancel && (
          <div className="mb-6 flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCancelModalOpen(true)}
              className="text-error hover:bg-red-50"
              leftIcon={<span className="material-symbols-outlined text-sm">cancel</span>}
            >
              Cancel Booking
            </Button>
          </div>
        )}

        {/* Completed Service Feedback Prompt */}
        {isCompleted && (
          <div className="mb-6">
            <Alert
              variant="success"
              title="Repair Completed!"
              action={
                <Link
                  to={`/feedback?jobReference=${encodeURIComponent(
                    publicReference || ''
                  )}&token=${encodeURIComponent(trackingData?.feedbackCapabilityToken || '')}`}
                >
                  <Button size="sm" variant="primary">
                    Rate Service
                  </Button>
                </Link>
              }
            >
              Our technician has marked this job completed. Please share your rating!
            </Alert>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col md:flex-row gap-md justify-center items-center pt-2">
          <Link to="/" className="w-full md:w-auto">
            <Button variant="primary" className="w-full md:w-auto px-xl">
              Return to Home
            </Button>
          </Link>
          <Link to="/contact" className="w-full md:w-auto">
            <Button
              variant="outline"
              className="w-full md:w-auto px-lg"
              leftIcon={<span className="material-symbols-outlined">support_agent</span>}
            >
              Contact Us
            </Button>
          </Link>
        </div>
      </div>

      {/* Cancellation Modal */}
      {publicReference && (
        <CancelModal
          isOpen={isCancelModalOpen}
          onClose={() => setIsCancelModalOpen(false)}
          publicReference={publicReference}
          canCancelWithoutCharge={canCancelWithoutCharge}
          visitingChargeAmount={visitingChargeAmount}
          onCancelledSuccess={() => refetch()}
        />
      )}
    </main>
  );
};

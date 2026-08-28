import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { useCancelBooking } from '@/hooks/useCancelBooking';
import { ProblemDetails } from '@/api/types';

export interface CancelModalProps {
  isOpen: boolean;
  onClose: () => void;
  publicReference: string;
  canCancelWithoutCharge: boolean;
  visitingChargeAmount?: number;
  onCancelledSuccess?: () => void;
}

export const CancelModal: React.FC<CancelModalProps> = ({
  isOpen,
  onClose,
  publicReference,
  canCancelWithoutCharge,
  visitingChargeAmount = 299,
  onCancelledSuccess,
}) => {
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const cancelMutation = useCancelBooking();

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reason.trim().length < 3) {
      setReasonError('Please provide a cancellation reason (at least 3 characters)');
      return;
    }
    setReasonError('');
    setErrorMessage('');

    try {
      await cancelMutation.mutateAsync({
        publicReference,
        payload: {
          cancellationReason: reason.trim(),
        },
      });
      onClose();
      onCancelledSuccess?.();
    } catch (err: unknown) {
      const problem = err as ProblemDetails;
      setErrorMessage(problem.detail || 'Unable to cancel booking. Please try again.');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Cancel Repair Booking" maxWidth="md">
      <form onSubmit={handleCancelSubmit} noValidate className="space-y-4 pt-2 text-left">
        {canCancelWithoutCharge ? (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-start gap-2">
            <span className="material-symbols-outlined text-base text-emerald-700 flex-shrink-0">
              check_circle
            </span>
            <span>
              <strong>Free Pre-Arrival Cancellation:</strong> Because our technician has not yet arrived
              at your doorstep, there is zero fee to cancel this booking.
            </span>
          </div>
        ) : (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2">
            <span className="material-symbols-outlined text-base text-amber-700 flex-shrink-0">
              warning
            </span>
            <span>
              <strong>Visiting Charge Notice:</strong> The technician has already arrived at your
              doorstep. Per policy, cancellation now incurs the standard visiting diagnosis fee of ₹
              {visitingChargeAmount.toFixed(2)}.
            </span>
          </div>
        )}

        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">error</span>
            {errorMessage}
          </div>
        )}

        <Textarea
          id="cancellation-reason"
          name="cancellation-reason"
          label="Reason for Cancellation"
          placeholder="Please let us know why you are cancelling (e.g. issue resolved, scheduling conflict)..."
          value={reason}
          onChange={(e) => {
            setReason(e.target.value);
            if (reasonError) setReasonError('');
          }}
          error={reasonError}
          rows={3}
          required
        />

        <div className="flex gap-3 justify-end pt-2">
          <Button variant="ghost" onClick={onClose} disabled={cancelMutation.isPending}>
            Keep Booking
          </Button>
          <Button
            variant="destructive"
            type="submit"
            isLoading={cancelMutation.isPending}
            leftIcon={<span className="material-symbols-outlined text-[18px]">cancel</span>}
          >
            Confirm Cancellation
          </Button>
        </div>
      </form>
    </Modal>
  );
};

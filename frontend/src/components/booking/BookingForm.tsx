import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthProvider';
import { useServices } from '@/hooks/useServices';
import { useAvailability } from '@/hooks/useAvailability';
import { useBooking } from '@/hooks/useBooking';
import { useIdempotencyKey } from '@/hooks/useIdempotencyKey';
import { bookingFormInputSchema } from '@/api/schemas';
import { TimeSlot, AlternativeSlot, ProblemDetails } from '@/api/types';
import { getTodayISO } from '@/lib/dateUtils';
import { PersonalDetailsSection } from './PersonalDetailsSection';
import { ServiceDetailsSection } from './ServiceDetailsSection';
import { SlotPicker } from './SlotPicker';
import { PhoneVerificationModal } from '@/components/auth/PhoneVerificationModal';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';

export const BookingForm: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialServiceId = searchParams.get('serviceId') || '';

  const { user, isPhoneVerified } = useAuth();
  const [hasVerifiedInSession, setHasVerifiedInSession] = useState(false);
  const isVerified = isPhoneVerified || hasVerifiedInSession;
  const [showGateModal, setShowGateModal] = useState(false);

  // Form State
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [serviceId, setServiceId] = useState(initialServiceId);
  const [locationAddress, setLocationAddress] = useState('');
  const [problemDescription, setProblemDescription] = useState('');
  const [selectedDate, setSelectedDate] = useState(getTodayISO());
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  // Open gate modal if user is authenticated but phone is unverified
  useEffect(() => {
    if (user && !isVerified) {
      setShowGateModal(true);
    } else {
      setShowGateModal(false);
    }
  }, [user, isVerified]);

  // Pre-fill user phone if available from auth
  useEffect(() => {
    if (user?.phoneNumber && !phoneNumber) {
      setPhoneNumber(user.phoneNumber);
    }
  }, [user?.phoneNumber]);

  // Pre-fill user name if available from auth
  useEffect(() => {
    if (user?.displayName && !fullName) {
      setFullName(user.displayName);
    }
  }, [user?.displayName]);

  // Field validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<ProblemDetails | null>(null);
  const [conflictAlternatives, setConflictAlternatives] = useState<AlternativeSlot[]>([]);

  // Idempotency Key
  const { idempotencyKey, regenerateKey } = useIdempotencyKey();

  // React Query Hooks
  const { data: services, isLoading: isLoadingServices } = useServices();
  const { data: availabilityData, isLoading: isLoadingSlots, refetch: refetchSlots } = useAvailability(
    serviceId || undefined,
    selectedDate
  );
  const bookingMutation = useBooking();

  // Automatically select first service if none selected and services load
  useEffect(() => {
    if (!serviceId && services && services.length > 0) {
      setServiceId(services[0].id);
    }
  }, [services, serviceId]);

  // When date or service changes, reset slot selection & conflict alerts
  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
    setSelectedSlot(null);
    setConflictAlternatives([]);
    setGeneralError(null);
  };

  const handleServiceChange = (newServiceId: string) => {
    setServiceId(newServiceId);
    setSelectedSlot(null);
    setConflictAlternatives([]);
    setGeneralError(null);
  };

  const handleSelectSlot = (slot: TimeSlot) => {
    setSelectedSlot(slot);
    if (errors.slotId) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.slotId;
        return next;
      });
    }
  };

  const handleSelectAlternative = (alt: AlternativeSlot) => {
    // Convert alternative slot to TimeSlot and update selection
    const mappedSlot: TimeSlot = {
      slotId: alt.slotId,
      startTime: alt.startTime,
      endTime: alt.endTime,
      label: alt.label,
      available: true,
    };
    setSelectedSlot(mappedSlot);
    setConflictAlternatives([]);
    setGeneralError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);
    setConflictAlternatives([]);

    if (user && !isVerified) {
      setShowGateModal(true);
      return;
    }

    // Validate form data with Zod
    const validation = bookingFormInputSchema.safeParse({
      fullName,
      phoneNumber,
      serviceId,
      locationAddress,
      problemDescription,
      requestedDate: selectedDate,
      slotId: selectedSlot?.slotId || '',
      slotStartTime: selectedSlot?.startTime || '',
      slotEndTime: selectedSlot?.endTime || '',
    });

    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of validation.error.issues) {
        const fieldName = issue.path[0] as string;
        if (!fieldErrors[fieldName]) {
          fieldErrors[fieldName] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    setErrors({});

    try {
      const result = await bookingMutation.mutateAsync({
        payload: {
          fullName: validation.data.fullName,
          phoneNumber: validation.data.phoneNumber,
          serviceId: validation.data.serviceId,
          locationAddress: validation.data.locationAddress,
          problemDescription: validation.data.problemDescription,
          requestedDate: validation.data.requestedDate,
          slotId: validation.data.slotId,
          slotStartTime: validation.data.slotStartTime,
          slotEndTime: validation.data.slotEndTime,
        },
        idempotencyKey,
      });

      // Clear idempotency key on success and redirect to tracking page
      regenerateKey();
      navigate(`/booking/${encodeURIComponent(result.publicReference)}`, {
        state: { confirmation: result },
      });
    } catch (err: unknown) {
      const problem = err as ProblemDetails;
      setGeneralError(problem);

      // Handle 409 Conflict: SLOT_UNAVAILABLE
      if (problem.status === 409 || problem.code === 'SLOT_UNAVAILABLE') {
        if (problem.alternatives && problem.alternatives.length > 0) {
          setConflictAlternatives(problem.alternatives);
        }
        // Refetch availability slots from server
        refetchSlots();
        // Clear conflicting selected slot so user picks alternative
        setSelectedSlot(null);
      }
    }
  };

  return (
    <div className="w-full max-w-[800px] mx-auto px-margin-mobile py-lg">
      <div className="mb-lg text-left">
        <h1 className="font-h2 text-h2 text-on-surface mb-2">Book a Service</h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant">
          Fill out the details below to schedule your repair with transparent visiting charges (₹299).
        </p>
      </div>

      {user && !isVerified && (
        <div className="mb-6">
          <Alert variant="warning" title="Phone Verification Required">
            Please verify your mobile number to complete your booking.{' '}
            <button
              type="button"
              onClick={() => setShowGateModal(true)}
              className="font-semibold underline ml-1 text-teal-700 hover:text-teal-800 focus:outline-none"
            >
              Verify Now
            </button>
          </Alert>
        </div>
      )}

      {generalError && generalError.code !== 'SLOT_UNAVAILABLE' && (
        <div className="mb-6">
          <Alert variant="error" title={generalError.title}>
            {generalError.detail}
          </Alert>
        </div>
      )}

      <form noValidate onSubmit={handleSubmit} className="space-y-lg">
        {/* Personal Details */}
        <PersonalDetailsSection
          fullName={fullName}
          onFullNameChange={(val) => {
            setFullName(val);
            if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: '' }));
          }}
          fullNameError={errors.fullName}
          phoneNumber={phoneNumber}
          onPhoneNumberChange={(val) => {
            setPhoneNumber(val);
            if (errors.phoneNumber) setErrors((prev) => ({ ...prev, phoneNumber: '' }));
          }}
          phoneNumberError={errors.phoneNumber}
        />

        {/* Service Details */}
        <ServiceDetailsSection
          services={services}
          isLoadingServices={isLoadingServices}
          selectedServiceId={serviceId}
          onServiceChange={handleServiceChange}
          serviceError={errors.serviceId}
          locationAddress={locationAddress}
          onLocationAddressChange={(val) => {
            setLocationAddress(val);
            if (errors.locationAddress) setErrors((prev) => ({ ...prev, locationAddress: '' }));
          }}
          locationAddressError={errors.locationAddress}
          problemDescription={problemDescription}
          onProblemDescriptionChange={(val) => {
            setProblemDescription(val);
            if (errors.problemDescription) setErrors((prev) => ({ ...prev, problemDescription: '' }));
          }}
          problemDescriptionError={errors.problemDescription}
        />

        {/* Availability Slots */}
        <SlotPicker
          slots={availabilityData?.slots}
          isLoading={isLoadingSlots}
          selectedSlotId={selectedSlot?.slotId || ''}
          onSelectSlot={handleSelectSlot}
          selectedDate={selectedDate}
          onDateChange={handleDateChange}
          error={errors.slotId}
          conflictAlternatives={conflictAlternatives}
          onSelectAlternative={handleSelectAlternative}
        />

        {/* Submission CTA */}
        <div className="pt-md pb-xl">
          <Button
            type="submit"
            variant="primary"
            className="w-full"
            isLoading={bookingMutation.isPending}
            rightIcon={<span className="material-symbols-outlined">arrow_forward</span>}
          >
            Confirm Booking
          </Button>
          <p className="text-center text-sm text-on-surface-variant mt-4">
            By confirming, you agree to our Terms of Service. Free pre-arrival cancellation available anytime.
          </p>
        </div>
      </form>

      {/* Inline Phone Verification Gate Modal */}
      <PhoneVerificationModal
        isOpen={showGateModal}
        onClose={() => setShowGateModal(false)}
        onVerified={(verifiedPhone) => {
          setPhoneNumber(verifiedPhone);
          setHasVerifiedInSession(true);
          setShowGateModal(false);
        }}
      />
    </div>
  );
};

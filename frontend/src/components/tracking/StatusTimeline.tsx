import React from 'react';
import { JobState, BookingState } from '@/api/types';

export interface StatusTimelineProps {
  jobStatus: JobState;
  bookingState: BookingState;
  technicianName?: string;
  technicianPhone?: string;
}

const STEPS: { status: JobState; label: string; icon: string; description: string }[] = [
  {
    status: 'SCHEDULED',
    label: 'Confirmed',
    icon: 'check_circle',
    description: 'Booking confirmed and scheduled with technician.',
  },
  {
    status: 'EN_ROUTE',
    label: 'En Route',
    icon: 'directions_car',
    description: 'Technician is traveling to your doorstep in Solapur.',
  },
  {
    status: 'ARRIVED',
    label: 'Arrived',
    icon: 'home',
    description: 'Technician has arrived and is performing diagnosis.',
  },
  {
    status: 'COMPLETED',
    label: 'Completed',
    icon: 'task_alt',
    description: 'Appliance repair successfully completed and verified.',
  },
];

export const StatusTimeline: React.FC<StatusTimelineProps> = ({
  jobStatus,
  bookingState,
  technicianName,
  technicianPhone,
}) => {
  if (bookingState === 'CANCELLED') {
    return (
      <div className="p-4 mb-6 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 text-error text-left">
        <span className="material-symbols-outlined text-2xl flex-shrink-0">cancel</span>
        <div>
          <p className="font-bold">Booking Cancelled</p>
          <p className="text-sm text-slate-600 mt-0.5">
            This service booking has been cancelled. If you need assistance, please contact our support team.
          </p>
        </div>
      </div>
    );
  }

  // Determine active step index
  let currentIndex = 0;
  if (jobStatus === 'EN_ROUTE') currentIndex = 1;
  else if (jobStatus === 'ARRIVED' || jobStatus === 'DIAGNOSING' || jobStatus === 'DEVICE_TRANSFERRED' || jobStatus === 'WORKSHOP_REPAIR') currentIndex = 2;
  else if (jobStatus === 'COMPLETED') currentIndex = 3;

  return (
    <div className="w-full py-4 mb-6 bg-surface-container-lowest rounded-xl p-md border border-outline-variant/30 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <h3 className="font-h3 text-h3 text-on-surface">Live Repair Status</h3>
        {technicianName && (
          <div className="flex items-center gap-2 text-xs bg-surface-container px-3 py-1.5 rounded-full text-cyan-800 font-semibold">
            <span className="material-symbols-outlined text-sm">engineering</span>
            Technician: {technicianName}
            {technicianPhone && (
              <a href={`tel:${technicianPhone}`} className="underline ml-1 hover:text-cyan-900">
                {technicianPhone}
              </a>
            )}
          </div>
        )}
      </div>

      {/* Progress Line */}
      <div className="relative pt-2 pb-6">
        <div className="absolute top-6 left-6 right-6 h-1 bg-surface-container -translate-y-1/2 z-0" />
        <div
          className="absolute top-6 left-6 h-1 bg-primary-container -translate-y-1/2 z-0 transition-all duration-500"
          style={{ width: `${(Math.max(0, currentIndex) / (STEPS.length - 1)) * 90}%` }}
        />

        <div className="flex justify-between items-start relative z-10">
          {STEPS.map((step, idx) => {
            const isPassed = idx <= currentIndex;
            const isCurrent = idx === currentIndex;

            return (
              <div key={step.status} className="flex flex-col items-center text-center max-w-[80px]">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm transition-all ${
                    isPassed
                      ? 'bg-primary-container text-white shadow-sm ring-4 ring-white'
                      : 'bg-surface-container-highest text-outline ring-4 ring-white'
                  } ${isCurrent ? 'ring-primary-fixed scale-110' : ''}`}
                >
                  <span className="material-symbols-outlined text-[20px]">{step.icon}</span>
                </div>
                <span
                  className={`text-xs mt-2 font-semibold ${
                    isCurrent ? 'text-primary font-bold' : isPassed ? 'text-on-surface' : 'text-outline'
                  }`}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-surface p-3 rounded-lg border border-surface-container text-xs text-on-surface-variant flex items-center gap-2">
        <span className="material-symbols-outlined text-cyan-700 text-sm">info</span>
        <span>{STEPS[currentIndex]?.description || 'Technician is handling your request.'}</span>
      </div>
    </div>
  );
};

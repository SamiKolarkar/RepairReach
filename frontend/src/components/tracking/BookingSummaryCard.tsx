import React from 'react';
import { formatScheduledSlot } from '@/lib/dateUtils';

export interface BookingSummaryCardProps {
  publicReference: string;
  customerName: string;
  customerPhone?: string;
  serviceName: string;
  scheduledDate: string;
  scheduledStartTime: string;
  scheduledEndTime: string;
  locationAddress: string;
  problemDescription?: string;
}

export const BookingSummaryCard: React.FC<BookingSummaryCardProps> = ({
  publicReference,
  customerName,
  customerPhone,
  serviceName,
  scheduledDate,
  scheduledStartTime,
  scheduledEndTime,
  locationAddress,
  problemDescription,
}) => {
  const timeFormatted = formatScheduledSlot(scheduledDate, scheduledStartTime, scheduledEndTime);

  return (
    <div className="bg-surface rounded-lg p-md md:p-6 mb-6 border border-surface-container shadow-sm text-left space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-surface-container-high gap-2">
        <h2 className="font-h3 text-h3 text-on-background">Booking Summary</h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-outline uppercase font-semibold tracking-wider">Ref ID:</span>
          <span className="font-mono font-bold text-sm bg-surface-container-lowest px-2.5 py-1 rounded border border-outline-variant text-primary">
            {publicReference}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
        {/* Customer */}
        <div className="flex flex-col gap-xs">
          <span className="font-label-md text-label-md text-outline">Customer</span>
          <span className="font-body-md text-body-md text-on-background font-semibold flex items-center gap-2">
            <span className="material-symbols-outlined text-primary-container text-sm">person</span>
            {customerName}
            {customerPhone && <span className="text-xs text-slate-500 font-normal">({customerPhone})</span>}
          </span>
        </div>

        {/* Service */}
        <div className="flex flex-col gap-xs">
          <span className="font-label-md text-label-md text-outline">Service</span>
          <span className="font-body-md text-body-md text-on-background font-semibold flex items-center gap-2">
            <span className="material-symbols-outlined text-primary-container text-sm">build</span>
            {serviceName}
          </span>
        </div>

        {/* Date & Time */}
        <div className="flex flex-col gap-xs">
          <span className="font-label-md text-label-md text-outline">Date &amp; Time</span>
          <span className="font-body-md text-body-md text-on-background font-semibold flex items-center gap-2">
            <span className="material-symbols-outlined text-primary-container text-sm">event</span>
            {timeFormatted}
          </span>
        </div>

        {/* Location */}
        <div className="flex flex-col gap-xs">
          <span className="font-label-md text-label-md text-outline">Location</span>
          <span className="font-body-md text-body-md text-on-background font-semibold flex items-center gap-2">
            <span className="material-symbols-outlined text-primary-container text-sm">location_on</span>
            {locationAddress}
          </span>
        </div>
      </div>

      {problemDescription && (
        <div className="pt-3 border-t border-surface-container text-xs text-on-surface-variant">
          <span className="font-semibold text-on-surface">Issue Details:</span> {problemDescription}
        </div>
      )}
    </div>
  );
};

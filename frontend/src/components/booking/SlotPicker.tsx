import React from 'react';
import { TimeSlot, AlternativeSlot } from '@/api/types';
import { SlotSkeletonGrid } from '@/components/ui/Skeleton';
import { formatDisplayTime } from '@/lib/dateUtils';

export interface SlotPickerProps {
  slots: TimeSlot[] | undefined;
  isLoading: boolean;
  selectedSlotId: string;
  onSelectSlot: (slot: TimeSlot) => void;
  selectedDate: string;
  onDateChange: (date: string) => void;
  error?: string;
  conflictAlternatives?: AlternativeSlot[];
  onSelectAlternative?: (alt: AlternativeSlot) => void;
}

export const SlotPicker: React.FC<SlotPickerProps> = ({
  slots,
  isLoading,
  selectedSlotId,
  onSelectSlot,
  selectedDate,
  onDateChange,
  error,
  conflictAlternatives,
  onSelectAlternative,
}) => {
  return (
    <section className="bg-surface-container-lowest rounded-xl p-md shadow-level-1 border border-outline-variant/30 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-md">
        <div>
          <h2 className="font-h3 text-h3 text-on-surface">Choose Your Time Slot</h2>
          {slots && slots.length > 0 && (
            <p className="text-sm text-on-surface-variant mt-0.5">
              {slots.length} slot{slots.length !== 1 ? 's' : ''} available — tap to select
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="slot-date-picker" className="text-sm font-semibold text-on-surface-variant flex items-center gap-1 cursor-pointer">
            <span className="material-symbols-outlined text-[18px]">calendar_today</span>
            Date:
          </label>
          <input
            id="slot-date-picker"
            type="date"
            value={selectedDate}
            min={new Date().toISOString().split('T')[0]}
            onChange={(e) => onDateChange(e.target.value)}
            className="h-[40px] px-3 rounded-lg border border-outline-variant bg-surface text-on-surface font-body-md text-sm shadow-sm focus:ring-2 focus:ring-primary-container focus:outline-none cursor-pointer"
          />
        </div>
      </div>

      {/* 409 Conflict Alternative Banner if present */}
      {conflictAlternatives && conflictAlternatives.length > 0 && (
        <div className="p-4 mb-4 bg-error-container rounded-lg border border-error/20 flex items-start gap-3 text-on-error-container">
          <span className="material-symbols-outlined text-error text-[24px] flex-shrink-0 mt-0.5">
            warning
          </span>
          <div className="text-sm space-y-2 flex-grow">
            <div>
              <p className="font-bold text-base text-on-error-container">Slot Just Taken by Another Customer</p>
              <p className="mt-0.5 text-on-error-container/90">
                The time slot you selected was confirmed milliseconds ago. Please choose one of the alternative slots below:
              </p>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {conflictAlternatives.map((alt) => (
                <button
                  key={alt.slotId}
                  type="button"
                  onClick={() => onSelectAlternative?.(alt)}
                  className="px-3 py-1.5 bg-white text-primary font-semibold text-xs rounded-lg border border-primary/30 hover:bg-primary hover:text-white shadow-xs transition-colors flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">schedule</span>
                  {alt.label || `${formatDisplayTime(alt.startTime)} - ${formatDisplayTime(alt.endTime)}`}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading ? (
        <SlotSkeletonGrid />
      ) : !slots || slots.length === 0 ? (
        <div className="py-8 text-center bg-surface rounded-lg border border-surface-container">
          <span className="material-symbols-outlined text-4xl text-outline mb-2">event_busy</span>
          <p className="font-bold text-on-surface">No slots available for this date</p>
          <p className="text-sm text-on-surface-variant mt-1">
            Please choose another date or select a different service.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-base">
          {slots.map((slot) => {
            const isSelected = selectedSlotId === slot.slotId;
            const label =
              slot.label ||
              `${formatDisplayTime(slot.startTime)} - ${formatDisplayTime(slot.endTime)}`;

            return (
              <label key={slot.slotId} className="cursor-pointer relative block group">
                <input
                  type="radio"
                  name="timeslot"
                  value={slot.slotId}
                  checked={isSelected}
                  onChange={() => onSelectSlot(slot)}
                  className="peer sr-only"
                />
                <div
                  className={`h-[64px] min-h-[48px] flex items-center justify-center rounded-lg border transition-all ${
                    isSelected
                      ? 'bg-primary-fixed border-primary-container text-primary-container font-bold shadow-sm'
                      : 'bg-surface-container-lowest border-outline-variant group-hover:bg-surface-container-low text-on-surface'
                  }`}
                >
                  <span className="font-label-md text-label-md">{label}</span>
                </div>
                {isSelected && (
                  <span
                    className="material-symbols-outlined absolute top-2 right-2 text-primary-container text-[20px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    check_circle
                  </span>
                )}
              </label>
            );
          })}
        </div>
      )}

      {error && (
        <p role="alert" className="text-xs text-error flex items-center gap-1 mt-3 font-medium">
          <span className="material-symbols-outlined text-sm">error</span>
          {error}
        </p>
      )}
    </section>
  );
};

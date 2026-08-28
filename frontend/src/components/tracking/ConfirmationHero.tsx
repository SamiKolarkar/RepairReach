import React from 'react';

export interface ConfirmationHeroProps {
  title?: string;
  subtitle?: string;
  isCancelled?: boolean;
}

export const ConfirmationHero: React.FC<ConfirmationHeroProps> = ({
  title = 'Booking Confirmed',
  subtitle = 'Your repair request has been successfully scheduled.',
  isCancelled = false,
}) => {
  return (
    <div className="flex flex-col items-center text-center mb-8 pt-2">
      <div
        className={`w-20 h-20 rounded-full flex items-center justify-center mb-md ${
          isCancelled ? 'bg-red-50 text-error' : 'bg-[#F0F9FF] text-primary-container'
        }`}
      >
        <span
          className="material-symbols-outlined text-5xl select-none"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          {isCancelled ? 'cancel' : 'check_circle'}
        </span>
      </div>
      <h1 className="font-h1 text-h1 text-on-background mb-xs tracking-tight">{title}</h1>
      <p className="font-body-lg text-body-lg text-outline max-w-md">{subtitle}</p>
    </div>
  );
};

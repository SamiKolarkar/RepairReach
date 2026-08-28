import React from 'react';
import { cn } from '@/lib/utils';

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  label?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  className,
  label = 'Loading...',
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
    xl: 'w-16 h-16 border-4',
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center justify-center gap-3 p-4"
    >
      <div
        className={cn(
          'animate-spin rounded-full border-primary-container border-t-transparent',
          sizeClasses[size],
          className
        )}
      />
      {label && <span className="text-sm font-medium text-on-surface-variant">{label}</span>}
      <span className="sr-only">{label}</span>
    </div>
  );
};

import React, { useState } from 'react';
import { cn } from '@/lib/utils';

export interface StarRatingProps {
  value: number;
  onChange?: (rating: number) => void;
  readOnly?: boolean;
  maxStars?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const StarRating: React.FC<StarRatingProps> = ({
  value,
  onChange,
  readOnly = false,
  maxStars = 5,
  size = 'lg',
  className,
}) => {
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  const displayRating = hoverValue !== null ? hoverValue : value;

  const sizeClasses = {
    sm: { button: 'min-w-[32px] min-h-[32px] p-1', icon: 'text-[20px]' },
    md: { button: 'min-w-[40px] min-h-[40px] p-1.5', icon: 'text-[28px]' },
    lg: { button: 'min-w-[48px] min-h-[48px] p-2', icon: 'text-[40px] md:text-[48px]' },
  };

  const handleKeyDown = (e: React.KeyboardEvent, star: number) => {
    if (readOnly || !onChange) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      onChange(Math.min(maxStars, star + 1));
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      onChange(Math.max(1, star - 1));
    } else if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      onChange(star);
    }
  };

  return (
    <div
      role={readOnly ? 'img' : 'radiogroup'}
      aria-label={`Rating: ${value} out of ${maxStars} stars`}
      className={cn('flex gap-2 md:gap-4 justify-center items-center', className)}
    >
      {Array.from({ length: maxStars }, (_, i) => {
        const starNumber = i + 1;
        const isFilled = starNumber <= displayRating;

        if (readOnly) {
          return (
            <span
              key={starNumber}
              className={cn(
                'inline-flex items-center justify-center transition-colors',
                isFilled ? 'text-amber-500' : 'text-slate-300'
              )}
            >
              <span
                className={cn('material-symbols-outlined select-none', sizeClasses[size].icon)}
                style={{ fontVariationSettings: `'FILL' ${isFilled ? 1 : 0}` }}
              >
                star
              </span>
            </span>
          );
        }

        return (
          <button
            key={starNumber}
            type="button"
            role="radio"
            aria-checked={starNumber === value}
            aria-label={`Rate ${starNumber} star${starNumber > 1 ? 's' : ''}`}
            onClick={() => onChange?.(starNumber)}
            onMouseEnter={() => setHoverValue(starNumber)}
            onMouseLeave={() => setHoverValue(null)}
            onKeyDown={(e) => handleKeyDown(e, starNumber)}
            tabIndex={starNumber === value || (value === 0 && starNumber === 1) ? 0 : -1}
            className={cn(
              'rounded-full flex items-center justify-center transition-colors focus:ring-2 focus:ring-primary focus:outline-none cursor-pointer',
              sizeClasses[size].button,
              isFilled
                ? 'text-amber-500'
                : 'text-outline-variant hover:text-secondary-fixed-dim hover:bg-surface-container'
            )}
          >
            <span
              className={cn('material-symbols-outlined select-none', sizeClasses[size].icon)}
              style={{ fontVariationSettings: `'FILL' ${isFilled ? 1 : 0}` }}
            >
              star
            </span>
          </button>
        );
      })}
    </div>
  );
};

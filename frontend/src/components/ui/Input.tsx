import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  leftIcon?: string | React.ReactNode;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, leftIcon, helperText, id, className, ...props }, ref) => {
    const inputId = id || label.toLowerCase().replace(/[^a-z0-9]/g, '-');

    return (
      <div className="space-y-xs w-full text-left">
        <label htmlFor={inputId} className="block font-label-md text-label-md text-on-surface">
          {label}
        </label>
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none select-none flex items-center justify-center">
              {typeof leftIcon === 'string' ? (
                <span className="material-symbols-outlined text-[20px]">{leftIcon}</span>
              ) : (
                leftIcon
              )}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={cn(
              'w-full h-[56px] min-h-[48px] rounded-lg border bg-surface-container-lowest text-on-surface font-body-md text-body-md shadow-sm transition-all focus:ring-2 focus:outline-none placeholder:text-outline',
              leftIcon ? 'pl-12 pr-4' : 'px-4',
              error
                ? 'border-error focus:ring-error focus:border-error text-error'
                : 'border-outline-variant focus:ring-primary-container focus:border-primary-container',
              className
            )}
            aria-invalid={!!error}
            aria-describedby={
              error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
            }
            {...props}
          />
        </div>
        {error && (
          <p
            id={`${inputId}-error`}
            role="alert"
            className="text-xs text-error flex items-center gap-1 mt-1 font-medium"
          >
            <span className="material-symbols-outlined text-sm">error</span>
            {error}
          </p>
        )}
        {!error && helperText && (
          <p id={`${inputId}-helper`} className="text-xs text-on-surface-variant mt-1">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

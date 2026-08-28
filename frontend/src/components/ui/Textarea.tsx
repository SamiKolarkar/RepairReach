import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  helperText?: string;
  maxLength?: number;
  currentLength?: number;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      error,
      helperText,
      maxLength,
      currentLength,
      id,
      className,
      rows = 4,
      ...props
    },
    ref
  ) => {
    const textareaId = id || label.toLowerCase().replace(/[^a-z0-9]/g, '-');

    return (
      <div className="space-y-xs w-full text-left">
        <div className="flex justify-between items-center">
          <label htmlFor={textareaId} className="block font-label-md text-label-md text-on-surface">
            {label}
          </label>
          {maxLength !== undefined && currentLength !== undefined && (
            <span className="text-xs text-on-surface-variant">
              {currentLength} / {maxLength}
            </span>
          )}
        </div>
        <textarea
          id={textareaId}
          ref={ref}
          rows={rows}
          maxLength={maxLength}
          className={cn(
            'w-full p-4 rounded-lg border bg-surface-container-lowest text-on-surface font-body-md text-body-md shadow-sm transition-all focus:ring-2 focus:outline-none placeholder:text-outline resize-none',
            error
              ? 'border-error focus:ring-error focus:border-error'
              : 'border-outline-variant focus:ring-primary-container focus:border-primary-container',
            className
          )}
          aria-invalid={!!error}
          aria-describedby={
            error ? `${textareaId}-error` : helperText ? `${textareaId}-helper` : undefined
          }
          {...props}
        />
        {error && (
          <p id={`${textareaId}-error`} role="alert" className="text-xs text-error flex items-center gap-1 mt-1 font-medium">
            <span className="material-symbols-outlined text-sm">error</span>
            {error}
          </p>
        )}
        {!error && helperText && (
          <p id={`${textareaId}-helper`} className="text-xs text-on-surface-variant mt-1">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

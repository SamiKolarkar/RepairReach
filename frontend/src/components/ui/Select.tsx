import React, { useState, forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { useClickOutside } from '@/hooks/useClickOutside';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label: string;
  options?: SelectOption[];
  error?: string;
  placeholder?: string;
  helperText?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      options,
      error,
      placeholder = 'Select an option...',
      helperText,
      id,
      className,
      value,
      onChange,
      disabled,
      ...props
    },
    ref
  ) => {
    const selectId = id || label.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const [isOpen, setIsOpen] = useState(false);

    const dropdownRef = useClickOutside<HTMLDivElement>(() => setIsOpen(false));

    const selectedOption = options?.find((opt) => opt.value === value);

    const handleSelect = (opt: SelectOption) => {
      if (opt.disabled || disabled) return;
      if (onChange) {
        // Create a synthetic-like event to maintain compatibility with existing handlers
        const event = {
          target: { value: opt.value, name: props.name },
          currentTarget: { value: opt.value, name: props.name },
        } as React.ChangeEvent<HTMLSelectElement>;
        onChange(event);
      }
      setIsOpen(false);
    };

    return (
      <div className="space-y-xs w-full text-left relative" ref={dropdownRef}>
        <label htmlFor={selectId} className="block font-label-md text-label-md text-on-surface">
          {label}
        </label>
        <div className="relative">
          {/* Hidden native select to maintain form semantics if needed (and ref forwarding) */}
          <select
            id={selectId}
            ref={ref}
            value={value}
            disabled={disabled}
            className="hidden"
            aria-hidden="true"
            {...props}
          >
            {placeholder && <option value="">{placeholder}</option>}
            {options?.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Custom Trigger Button */}
          <button
            type="button"
            disabled={disabled}
            aria-haspopup="listbox"
            aria-expanded={isOpen}
            aria-invalid={!!error}
            aria-describedby={
              error ? `${selectId}-error` : helperText ? `${selectId}-helper` : undefined
            }
            onClick={() => setIsOpen((prev) => !prev)}
            className={cn(
              'w-full h-[56px] min-h-[48px] px-4 flex items-center justify-between rounded-lg border bg-surface-container-lowest font-body-md text-body-md shadow-sm transition-all focus:ring-2 focus:outline-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-50',
              error
                ? 'border-error focus:ring-error focus:border-error text-error'
                : 'border-outline-variant focus:ring-primary-container focus:border-primary-container',
              className,
              !selectedOption ? 'text-on-surface-variant' : 'text-on-surface'
            )}
          >
            <span className="truncate">
              {selectedOption ? selectedOption.label : placeholder}
            </span>
            <ChevronDown
              className={cn(
                'w-5 h-5 flex-shrink-0 transition-transform text-on-surface-variant',
                isOpen && 'transform rotate-180'
              )}
            />
          </button>

          {/* Custom Dropdown Menu */}
          {isOpen && (
            <ul
              role="listbox"
              className="absolute z-50 w-full mt-1 bg-surface-container-lowest border border-outline-variant rounded-lg shadow-lg max-h-60 overflow-auto py-1 animate-in fade-in zoom-in-95"
            >
              {options?.map((opt) => (
                <li
                  key={opt.value}
                  role="option"
                  aria-selected={value === opt.value}
                  onClick={() => handleSelect(opt)}
                  className={cn(
                    'px-4 py-3 cursor-pointer transition-colors',
                    opt.disabled
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:bg-surface-container active:bg-surface-container-high',
                    value === opt.value && 'bg-primary-container/30 text-primary font-medium'
                  )}
                >
                  {opt.label}
                </li>
              ))}
            </ul>
          )}
        </div>
        {error && (
          <p
            id={`${selectId}-error`}
            role="alert"
            className="text-xs text-error flex items-center gap-1 mt-1 font-medium"
          >
            <span className="material-symbols-outlined text-sm">error</span>
            {error}
          </p>
        )}
        {!error && helperText && (
          <p id={`${selectId}-helper`} className="text-xs text-on-surface-variant mt-1">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

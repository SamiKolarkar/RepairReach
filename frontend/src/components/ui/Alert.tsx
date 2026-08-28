import React from 'react';
import { cn } from '@/lib/utils';

export interface AlertProps {
  variant?: 'error' | 'warning' | 'info' | 'success';
  title?: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({
  variant = 'info',
  title,
  children,
  icon,
  action,
  className,
}) => {
  const variantStyles = {
    error: 'bg-error-container text-on-error-container border-error/30',
    warning: 'bg-amber-50 text-amber-900 border-amber-300',
    info: 'bg-surface-container-low text-on-surface border-primary-container/20',
    success: 'bg-emerald-50 text-emerald-900 border-emerald-300',
  };

  const defaultIcons = {
    error: 'error',
    warning: 'warning',
    info: 'info',
    success: 'check_circle',
  };

  return (
    <div
      role="alert"
      className={cn(
        'p-4 rounded-lg border flex items-start gap-3 text-sm text-left shadow-sm',
        variantStyles[variant],
        className
      )}
    >
      <div className="flex-shrink-0 mt-0.5">
        {icon || (
          <span className="material-symbols-outlined text-[22px]">
            {defaultIcons[variant]}
          </span>
        )}
      </div>
      <div className="flex-grow">
        {title && <h4 className="font-bold text-base mb-1">{title}</h4>}
        <div className="leading-relaxed">{children}</div>
      </div>
      {action && <div className="flex-shrink-0 ml-2">{action}</div>}
    </div>
  );
};

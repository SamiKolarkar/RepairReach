import React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'secondary' | 'error' | 'surface' | 'success' | 'warning' | 'info';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'primary',
  size = 'sm',
  icon,
  className,
  ...props
}) => {
  const sizeStyles = {
    sm: 'px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider',
    md: 'px-3 py-1 text-xs font-semibold',
    lg: 'px-4 py-1.5 text-sm font-semibold',
  };

  const variantStyles = {
    primary: 'bg-primary-fixed text-on-primary-fixed border border-primary-fixed-dim/40',
    secondary: 'bg-[#F0F9FF] text-cyan-700 border border-cyan-200',
    error: 'bg-error-container text-error font-bold border border-error/20',
    surface: 'bg-surface-container text-on-surface-variant border border-outline-variant/30',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    warning: 'bg-amber-50 text-amber-800 border border-amber-200',
    info: 'bg-blue-50 text-blue-700 border border-blue-200',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-manrope select-none',
        sizeStyles[size],
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {icon && <span className="flex items-center">{icon}</span>}
      {children}
    </span>
  );
};

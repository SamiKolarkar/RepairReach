import React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'pill' | 'destructive';
  size?: 'default' | 'sm' | 'icon';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'default',
      isLoading = false,
      leftIcon,
      rightIcon,
      className,
      disabled,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-button font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-container focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none active:scale-[0.98] select-none';

    const sizeStyles = {
      default: 'h-[56px] min-h-[48px] px-6 text-button rounded-lg',
      sm: 'h-[40px] min-h-[40px] px-4 text-label-md rounded-lg',
      icon: 'h-[48px] w-[48px] min-h-[48px] min-w-[48px] p-2 rounded-full',
    };

    const variantStyles = {
      primary:
        'bg-primary-container text-on-primary shadow-level-1 hover:bg-primary hover:shadow-level-2',
      secondary:
        'bg-secondary-container text-on-secondary-container hover:bg-secondary hover:text-white',
      outline:
        'border-2 border-[#E2E8F0] text-primary-container bg-surface-container-lowest hover:bg-[#F0F9FF] hover:border-primary-container',
      ghost: 'bg-transparent text-primary hover:bg-surface-container-low',
      pill: 'h-[56px] min-h-[48px] px-8 bg-primary-container text-on-primary rounded-full shadow-level-1 hover:bg-primary hover:shadow-level-2',
      destructive:
        'bg-error text-on-error hover:bg-red-700 focus:ring-error shadow-sm',
    };

    return (
      <button
        ref={ref}
        type={type}
        className={cn(baseStyles, sizeStyles[size], variantStyles[variant], className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <span
            data-testid="loading-spinner"
            className="animate-spin rounded-full h-5 w-5 border-2 border-current border-t-transparent mr-2 flex-shrink-0"
          />
        ) : leftIcon ? (
          <span className="mr-2 flex items-center flex-shrink-0">{leftIcon}</span>
        ) : null}
        {children}
        {!isLoading && rightIcon && (
          <span className="ml-2 flex items-center flex-shrink-0">{rightIcon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

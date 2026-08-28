import React from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'surface' | 'container' | 'nested' | 'interactive';
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'surface',
  className,
  ...props
}) => {
  const variantStyles = {
    surface:
      'bg-surface-container-lowest rounded-xl p-md md:p-6 shadow-level-1 border border-outline-variant/30',
    container:
      'bg-surface-container-lowest rounded-xl p-md md:p-8 shadow-level-2 border border-surface-container-high relative overflow-hidden',
    nested:
      'bg-surface rounded-lg p-md border border-surface-container shadow-sm',
    interactive:
      'bg-surface-container-lowest rounded-xl p-md md:p-6 shadow-level-1 border border-outline-variant/30 hover:shadow-card-hover hover:border-primary-container/40 transition-all duration-200 cursor-pointer',
  };

  return (
    <div className={cn(variantStyles[variant], className)} {...props}>
      {children}
    </div>
  );
};

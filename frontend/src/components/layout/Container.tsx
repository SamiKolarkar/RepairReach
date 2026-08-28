import React from 'react';
import { cn } from '@/lib/utils';

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'default' | 'narrow' | 'wide';
}

export const Container: React.FC<ContainerProps> = ({
  children,
  size = 'default',
  className,
  ...props
}) => {
  const sizeClasses = {
    narrow: 'max-w-[800px]',
    default: 'max-w-[1200px]',
    wide: 'max-w-[1400px]',
  };

  return (
    <div
      className={cn(
        'w-full mx-auto px-margin-mobile sm:px-6 lg:px-8',
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

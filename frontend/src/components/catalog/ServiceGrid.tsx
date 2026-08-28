import React from 'react';
import { ServiceOffering } from '@/api/types';
import { ServiceCard } from './ServiceCard';
import { CardSkeleton } from '@/components/ui/Skeleton';

export interface ServiceGridProps {
  services: ServiceOffering[] | undefined;
  isLoading: boolean;
}

export const ServiceGrid: React.FC<ServiceGridProps> = ({ services, isLoading }) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!services || services.length === 0) {
    return (
      <div className="py-12 text-center bg-surface rounded-xl border border-surface-container">
        <span className="material-symbols-outlined text-5xl text-outline mb-2">build_circle</span>
        <h3 className="font-h3 text-xl font-bold text-on-surface">No Services Found</h3>
        <p className="text-sm text-on-surface-variant mt-1">
          Our service catalog is currently updating. Please check back shortly.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {services.map((service) => (
        <ServiceCard key={service.id} service={service} />
      ))}
    </div>
  );
};

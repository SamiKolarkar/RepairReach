import React from 'react';
import { ServiceOffering } from '@/api/types';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';

export interface ServiceDetailsSectionProps {
  services: ServiceOffering[] | undefined;
  isLoadingServices: boolean;
  selectedServiceId: string;
  onServiceChange: (serviceId: string) => void;
  serviceError?: string;
  locationAddress: string;
  onLocationAddressChange: (address: string) => void;
  locationAddressError?: string;
  problemDescription: string;
  onProblemDescriptionChange: (problem: string) => void;
  problemDescriptionError?: string;
}

export const ServiceDetailsSection: React.FC<ServiceDetailsSectionProps> = ({
  services,
  isLoadingServices,
  selectedServiceId,
  onServiceChange,
  serviceError,
  locationAddress,
  onLocationAddressChange,
  locationAddressError,
  problemDescription,
  onProblemDescriptionChange,
  problemDescriptionError,
}) => {
  const serviceOptions =
    services?.map((svc) => ({
      value: svc.id,
      label: `${svc.name} ${svc.priceEstimate ? `(${svc.priceEstimate})` : ''}`,
    })) || [];

  return (
    <section className="bg-surface-container-lowest rounded-xl p-md shadow-level-1 border border-outline-variant/30 text-left">
      <h2 className="font-h3 text-h3 text-on-surface mb-md">Service Details</h2>
      <div className="space-y-md">
        <Select
          id="service-type"
          name="service-type"
          label="Service Type"
          placeholder={isLoadingServices ? 'Loading available services...' : 'Select a service...'}
          options={serviceOptions}
          value={selectedServiceId}
          onChange={(e) => onServiceChange(e.target.value)}
          error={serviceError}
          disabled={isLoadingServices}
          required
        />

        <Input
          id="location"
          name="location"
          label="Service Location"
          placeholder="e.g. 123 Main St, Market Yard, Solapur 413001"
          value={locationAddress}
          onChange={(e) => onLocationAddressChange(e.target.value)}
          error={locationAddressError}
          leftIcon="location_on"
          helperText="Doorstep technician visit address in Solapur"
          required
        />

        <Textarea
          id="problem"
          name="problem"
          label="Problem Description"
          placeholder="Please describe the issue in detail (e.g. AC cooling stopped completely and making unusual buzzing noise)..."
          value={problemDescription}
          onChange={(e) => onProblemDescriptionChange(e.target.value)}
          error={problemDescriptionError}
          rows={4}
          maxLength={1000}
          currentLength={problemDescription.length}
          helperText="Minimum 10 characters describing the problem"
          required
        />
      </div>
    </section>
  );
};

import React from 'react';
import { Link } from 'react-router-dom';
import { ServiceOffering } from '@/api/types';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export interface ServiceCardProps {
  service: ServiceOffering;
}

const SERVICE_ICONS: Record<string, string> = {
  AC_REPAIR: 'mode_fan',
  TV_REPAIR: 'tv',
  WASHING_MACHINE_REPAIR: 'local_laundry_service',
  REFRIGERATOR_REPAIR: 'kitchen',
  MICROWAVE_REPAIR: 'microwave',
};

export const ServiceCard: React.FC<ServiceCardProps> = ({ service }) => {
  const icon = SERVICE_ICONS[service.code] || 'build';

  return (
    <Card variant="surface" className="flex flex-col justify-between h-full text-left space-y-4">
      <div className="space-y-3">
        {/* Header with Icon and Category */}
        <div className="flex justify-between items-start">
          <div className="w-12 h-12 rounded-lg bg-primary-fixed flex items-center justify-center text-primary-container">
            <span
              className="material-symbols-outlined text-[28px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {icon}
            </span>
          </div>
          <Badge variant="secondary">
            {service.category === 'HOME_APPLIANCE'
              ? 'Home Appliance'
              : service.category === 'ELECTRONICS'
              ? 'Electronics'
              : 'Commercial'}
          </Badge>
        </div>

        {/* Title and Description */}
        <div>
          <h3 className="font-h3 text-xl font-bold text-on-surface mb-1">{service.name}</h3>
          <p className="text-sm text-on-surface-variant line-clamp-3 leading-relaxed">
            {service.description}
          </p>
        </div>

        {/* Badges / Capabilities */}
        <div className="flex flex-wrap gap-2 pt-1">
          <Badge variant="surface" size="sm" icon={<span className="material-symbols-outlined text-xs">schedule</span>}>
            ~{service.baseDurationMinutes} mins
          </Badge>
          {service.supportsHomeService && (
            <Badge variant="primary" size="sm" icon={<span className="material-symbols-outlined text-xs">home</span>}>
              Doorstep Visit
            </Badge>
          )}
          {service.supportsWorkshopRepair && (
            <Badge variant="surface" size="sm" icon={<span className="material-symbols-outlined text-xs">store</span>}>
              Workshop Capable
            </Badge>
          )}
        </div>
      </div>

      {/* Footer CTA & Pricing */}
      <div className="pt-4 border-t border-surface-container flex items-center justify-between mt-auto">
        <div>
          <span className="text-xs text-outline block">Starting Price</span>
          <span className="font-bold text-base text-primary font-manrope">
            {service.priceEstimate || 'Starting at ₹299'}
          </span>
        </div>
        <Link to={`/book?serviceId=${encodeURIComponent(service.id)}`}>
          <Button size="sm" variant="primary">
            Book Now
          </Button>
        </Link>
      </div>
    </Card>
  );
};

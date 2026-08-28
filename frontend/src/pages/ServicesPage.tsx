import React, { useState } from 'react';
import { useServices } from '@/hooks/useServices';
import { ServiceGrid } from '@/components/catalog/ServiceGrid';
import { ServiceCategory } from '@/api/types';

export const ServicesPage: React.FC = () => {
  const { data: services, isLoading } = useServices();
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const categories: { label: string; value: string }[] = [
    { label: 'All Services', value: 'ALL' },
    { label: 'Home Appliances', value: 'HOME_APPLIANCE' },
    { label: 'Electronics', value: 'ELECTRONICS' },
  ];

  const filteredServices = services?.filter((s) => {
    if (selectedCategory === 'ALL') return true;
    return s.category === (selectedCategory as ServiceCategory);
  });

  return (
    <div className="max-w-[1200px] mx-auto px-margin-mobile py-8 md:py-12 text-left space-y-8">
      {/* Header */}
      <div className="max-w-2xl">
        <h1 className="font-h1 text-3xl sm:text-4xl font-extrabold text-on-surface mb-2">
          Appliance Repair Services
        </h1>
        <p className="font-body-lg text-base sm:text-lg text-on-surface-variant leading-relaxed">
          Comprehensive doorstep repair, preventive maintenance, and genuine part replacements for
          all major home appliance brands across Solapur.
        </p>
      </div>

      {/* Category Filter Chips */}
      <div className="flex flex-wrap gap-2 pt-2 border-b border-surface-container pb-4">
        {categories.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setSelectedCategory(cat.value)}
            className={`px-4 py-2 rounded-full text-xs font-semibold transition-all min-h-[40px] ${
              selectedCategory === cat.value
                ? 'bg-primary-container text-white shadow-sm'
                : 'bg-surface text-slate-700 hover:bg-surface-container border border-outline-variant/30'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Service Grid */}
      <ServiceGrid services={filteredServices} isLoading={isLoading} />

      {/* Visiting Charge Policy Note */}
      <div className="p-6 bg-surface rounded-xl border border-surface-container text-xs text-on-surface-variant space-y-2">
        <h4 className="font-bold text-on-surface text-sm flex items-center gap-1.5">
          <span className="material-symbols-outlined text-base text-primary">policy</span>
          Standard Visiting &amp; Diagnosis Fee: ₹299
        </h4>
        <p className="leading-relaxed">
          A standard ₹299 visiting diagnosis fee covers technician travel, complete electrical/mechanical
          fault inspection at your home in Solapur. If you choose to proceed with repair and parts
          replacement, the cost of parts will be quoted upfront with zero hidden charges.
        </p>
      </div>
    </div>
  );
};

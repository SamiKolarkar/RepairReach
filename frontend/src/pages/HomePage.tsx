import React from 'react';
import { Link } from 'react-router-dom';
import { useServices } from '@/hooks/useServices';
import { useTestimonials } from '@/hooks/useTestimonials';
import { ServiceGrid } from '@/components/catalog/ServiceGrid';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StarRating } from '@/components/ui/StarRating';

export const HomePage: React.FC = () => {
  const { data: services, isLoading: isLoadingServices } = useServices();
  const { data: testimonials, isLoading: isLoadingTestimonials } = useTestimonials();

  const trustPillars = [
    {
      icon: 'verified',
      title: 'Transparent Pricing',
      description: 'Standard ₹299 doorstep visiting diagnosis fee. No hidden fees or inflated spare parts pricing.',
    },
    {
      icon: 'engineering',
      title: 'Certified Technicians',
      description: 'Trained appliance specialists with extensive expertise in major electronics & home brands.',
    },
    {
      icon: 'speed',
      title: 'Same-Day Service',
      description: 'Convenient 2-hour scheduling windows across Solapur with live technician status tracking.',
    },
    {
      icon: 'published_with_changes',
      title: '100% Genuine Parts',
      description: 'We only use brand-authorized replacement parts with service warranty protection.',
    },
  ];

  return (
    <div className="w-full space-y-16 py-8">
      {/* Hero Section */}
      <section className="max-w-[1200px] mx-auto px-margin-mobile pt-4 md:pt-12 text-left">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#F0F9FF] text-cyan-800 text-xs font-bold rounded-full border border-cyan-200">
              <span className="material-symbols-outlined text-sm text-cyan-600">location_on</span>
              Solapur's Premier Appliance Repair Platform
            </div>

            <h1 className="font-h1 text-4xl sm:text-5xl font-extrabold text-on-surface leading-[1.15] tracking-tight">
              Reliable Appliance Repair at Your Doorstep
            </h1>

            <p className="font-body-lg text-lg sm:text-xl text-on-surface-variant max-w-xl leading-relaxed">
              Book expert repairs for Washing Machines, Refrigerators, ACs, Microwaves, and TVs in
              minutes. Real-time scheduling with guaranteed certified technicians.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <Link to="/book" className="w-full sm:w-auto">
                <Button
                  variant="primary"
                  className="w-full sm:w-auto"
                  rightIcon={<span className="material-symbols-outlined">arrow_forward</span>}
                >
                  Book a Repair
                </Button>
              </Link>
              <Link to="/services" className="w-full sm:w-auto">
                <Button variant="outline" className="w-full sm:w-auto">
                  View All Services
                </Button>
              </Link>
            </div>

            <div className="flex items-center gap-6 pt-4 text-xs font-semibold text-slate-600 border-t border-surface-container">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-emerald-600 text-base">check_circle</span>
                <span>Free Pre-Arrival Cancellation</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-emerald-600 text-base">check_circle</span>
                <span>Standard ₹299 Visit Charge</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-level-2 border border-surface-container-high space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-surface-container">
                <h3 className="font-bold text-on-surface text-base">Quick Service Booking</h3>
                <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
                  Slots Open Today
                </span>
              </div>
              <p className="text-xs text-on-surface-variant">
                Select your appliance to check live available slots in Solapur:
              </p>
              <div className="grid grid-cols-2 gap-3">
                {['AC Repair', 'Washing Machine', 'Refrigerator', 'Microwave', 'TV & Display'].map(
                  (item) => (
                    <Link
                      key={item}
                      to="/book"
                      className="p-3 bg-surface rounded-lg border border-outline-variant/30 hover:border-primary-container hover:bg-surface-container-low transition-all text-xs font-semibold text-on-surface flex items-center justify-between group"
                    >
                      <span>{item}</span>
                      <span className="material-symbols-outlined text-sm text-outline group-hover:text-primary transition-colors">
                        chevron_right
                      </span>
                    </Link>
                  )
                )}
              </div>
              <Link to="/book" className="block pt-2">
                <Button size="sm" variant="primary" className="w-full">
                  Check Slot Availability
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Pillars */}
      <section className="bg-surface py-12 border-y border-surface-container">
        <div className="max-w-[1200px] mx-auto px-margin-mobile text-left">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="font-h2 text-3xl font-bold text-on-surface mb-2">Why Solapur Chooses RepairReach</h2>
            <p className="text-on-surface-variant text-base">
              Built from the ground up to provide transparent, reliable, and certified appliance servicing.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {trustPillars.map((pillar) => (
              <Card key={pillar.title} variant="surface" className="p-5 space-y-3">
                <div className="w-10 h-10 rounded-lg bg-[#F0F9FF] text-cyan-700 flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl">{pillar.icon}</span>
                </div>
                <h3 className="font-bold text-base text-on-surface">{pillar.title}</h3>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  {pillar.description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Services Showcase */}
      <section className="max-w-[1200px] mx-auto px-margin-mobile text-left">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <h2 className="font-h2 text-3xl font-bold text-on-surface mb-2">Our Repair Services</h2>
            <p className="text-on-surface-variant text-base">
              Doorstep diagnosis and genuine part replacements for all major household electronics.
            </p>
          </div>
          <Link to="/services">
            <Button variant="ghost" rightIcon={<span className="material-symbols-outlined">arrow_forward</span>}>
              View Full Catalog
            </Button>
          </Link>
        </div>

        <ServiceGrid services={services} isLoading={isLoadingServices} />
      </section>

      {/* Testimonials Preview */}
      <section className="max-w-[1200px] mx-auto px-margin-mobile text-left">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <h2 className="font-h2 text-3xl font-bold text-on-surface mb-2">Customer Experiences</h2>
            <p className="text-on-surface-variant text-base">
              Read verified reviews from homeowners across Solapur.
            </p>
          </div>
          <Link to="/testimonials">
            <Button variant="ghost" rightIcon={<span className="material-symbols-outlined">arrow_forward</span>}>
              Read All Reviews
            </Button>
          </Link>
        </div>

        {isLoadingTestimonials ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-surface p-6 rounded-xl border border-surface-container animate-pulse space-y-3">
                <div className="h-4 bg-slate-200 rounded w-24" />
                <div className="h-4 bg-slate-200 rounded w-full" />
                <div className="h-4 bg-slate-200 rounded w-4/5" />
              </div>
            ))}
          </div>
        ) : !testimonials || testimonials.length === 0 ? (
          <div className="p-8 bg-surface rounded-xl border border-surface-container text-center">
            <p className="text-on-surface-variant text-sm">
              Customer feedback and testimonials will appear here once verified.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.slice(0, 3).map((item) => (
              <Card key={item.id} variant="surface" className="p-6 space-y-3">
                <StarRating value={item.rating} readOnly size="sm" />
                <p className="text-sm text-slate-700 italic leading-relaxed">
                  "{item.reviewText}"
                </p>
                <div className="pt-2 border-t border-surface-container flex items-center justify-between text-xs text-on-surface-variant">
                  <span className="font-bold text-on-surface">{item.customerName}</span>
                  <span>{item.serviceType}</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* CTA Banner */}
      <section className="max-w-[1200px] mx-auto px-margin-mobile">
        <div className="bg-primary-container text-on-primary rounded-2xl p-8 md:p-12 text-center md:text-left flex flex-col md:flex-row items-center justify-between gap-6 shadow-level-2">
          <div className="space-y-2 max-w-xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Ready to schedule your repair?
            </h2>
            <p className="text-on-primary-container text-sm md:text-base">
              Book a guaranteed time slot today. Fast arrival, honest diagnosis, and transparent ₹299 visiting charges.
            </p>
          </div>
          <Link to="/book" className="flex-shrink-0">
            <Button
              variant="pill"
              className="bg-white text-primary hover:bg-slate-100 shadow-md font-bold px-8"
              rightIcon={<span className="material-symbols-outlined">calendar_today</span>}
            >
              Book Service Now
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

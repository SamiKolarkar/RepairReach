import React from 'react';
import { useBusiness } from '@/hooks/useBusiness';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export const ContactPage: React.FC = () => {
  const { data: business } = useBusiness();

  const phone = business?.phone || '+91 98765 43210';
  const whatsappNumber = business?.whatsappNumber || '+91 98765 43210';
  const address = business?.address || 'Shop No. 4, Market Yard Road, Solapur, Maharashtra 413001';
  const weekdayHours = business?.workingHours?.weekday || '9:00 AM - 7:00 PM';
  const sundayHours = business?.workingHours?.sunday || '9:00 AM - 2:00 PM';
  const breakHours = business?.workingHours?.afternoonBreak || '2:00 PM - 4:00 PM';

  return (
    <div className="max-w-[1200px] mx-auto px-margin-mobile py-8 md:py-12 text-left space-y-8">
      {/* Header */}
      <div className="max-w-2xl">
        <h1 className="font-h1 text-3xl sm:text-4xl font-extrabold text-on-surface mb-2">
          Contact &amp; Operating Hours
        </h1>
        <p className="font-body-lg text-base sm:text-lg text-on-surface-variant leading-relaxed">
          Need immediate support or have an inquiry regarding your repair? Reach our Solapur service desk
          directly via phone, WhatsApp, or visit our central workshop.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Contact Methods Card */}
        <Card variant="surface" className="p-6 md:p-8 space-y-6">
          <h2 className="font-h3 text-2xl font-bold text-on-surface">Direct Contact Channels</h2>

          <div className="space-y-4">
            {/* Phone */}
            <div className="flex items-start gap-4 p-4 bg-surface rounded-lg border border-surface-container">
              <div className="w-10 h-10 rounded-full bg-primary-fixed text-primary flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined">call</span>
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-on-surface">Customer Helpline</h4>
                <p className="text-xs text-on-surface-variant">Speak with our repair coordinator</p>
                <a
                  href={`tel:${phone.replace(/\s+/g, '')}`}
                  className="text-base font-bold text-primary hover:underline inline-block pt-1"
                >
                  {phone}
                </a>
              </div>
            </div>

            {/* WhatsApp */}
            <div className="flex items-start gap-4 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined">chat</span>
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-emerald-900">WhatsApp Instant Booking</h4>
                <p className="text-xs text-emerald-700">Send photos/videos of appliance fault</p>
                <a
                  href={`https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block pt-1"
                >
                  <Button size="sm" variant="primary" className="bg-emerald-600 hover:bg-emerald-700">
                    Chat on WhatsApp
                  </Button>
                </a>
              </div>
            </div>

            {/* Address */}
            <div className="flex items-start gap-4 p-4 bg-surface rounded-lg border border-surface-container">
              <div className="w-10 h-10 rounded-full bg-primary-fixed text-primary flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined">location_on</span>
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-on-surface">Workshop Location</h4>
                <p className="text-xs text-on-surface-variant">{address}</p>
                <p className="text-xs text-slate-500 pt-1">
                  Serving all areas in Solapur Municipal Corporation limits.
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Operating Schedule & Service Rules */}
        <Card variant="surface" className="p-6 md:p-8 space-y-6">
          <h2 className="font-h3 text-2xl font-bold text-on-surface">Solapur Operating Schedule</h2>

          <div className="space-y-3">
            <div className="flex justify-between items-center py-3 border-b border-surface-container text-sm">
              <span className="font-semibold text-on-surface">Monday – Saturday</span>
              <span className="font-bold text-primary">{weekdayHours}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-surface-container text-sm">
              <span className="font-semibold text-on-surface">Sunday (Half Day)</span>
              <span className="font-bold text-primary">{sundayHours}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-surface-container text-sm">
              <span className="font-semibold text-on-surface">Afternoon Technician Break</span>
              <span className="text-on-surface-variant text-xs">{breakHours}</span>
            </div>
          </div>

          <div className="p-4 bg-surface-container-low rounded-lg border border-outline-variant/30 text-xs space-y-2">
            <h4 className="font-bold text-on-surface text-sm flex items-center gap-1">
              <span className="material-symbols-outlined text-base text-primary">info</span>
              Visiting Diagnosis Policy
            </h4>
            <p className="text-on-surface-variant leading-relaxed">
              Our technician visits your location, performs complete diagnostics, and provides an upfront
              estimate. If you cancel prior to technician arrival, there is no fee. If technician has
              already reached your address, the standard ₹299 visit fee applies.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

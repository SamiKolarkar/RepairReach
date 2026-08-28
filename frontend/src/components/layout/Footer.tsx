import React from 'react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-50 font-manrope text-sm w-full py-12 mt-auto border-t border-slate-200">
      <div className="max-w-[1200px] mx-auto px-margin-mobile">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8 text-left">
          {/* Brand Col */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <span
                className="material-symbols-outlined text-cyan-700 text-[24px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                handyman
              </span>
              <span className="text-xl font-extrabold text-cyan-700 tracking-tight">
                RepairReach
              </span>
            </div>
            <p className="text-slate-600 max-w-md text-sm leading-relaxed">
              Professional, transparent doorstep appliance repair in Solapur, Maharashtra. We fix
              Washing Machines, ACs, Refrigerators, Microwaves, and TVs with guaranteed genuine parts.
            </p>
            <div className="flex flex-col gap-1.5 pt-2 text-xs text-slate-500">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-cyan-700 leading-none">schedule</span>
                <span className="leading-none">Mon–Sat: 9:00 AM – 7:00 PM</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-cyan-700 leading-none">schedule</span>
                <span className="leading-none">Sun: 9:00 AM – 2:00 PM</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="font-label-md font-bold text-on-surface text-sm">Quick Links</h4>
            <ul className="space-y-2 text-slate-600 text-sm">
              <li>
                <Link to="/services" className="hover:text-cyan-700 transition-colors">
                  All Repair Services
                </Link>
              </li>
              <li>
                <Link to="/book" className="hover:text-cyan-700 transition-colors">
                  Book a Slot
                </Link>
              </li>
              <li>
                <Link to="/testimonials" className="hover:text-cyan-700 transition-colors">
                  Customer Reviews
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-cyan-700 transition-colors">
                  Contact & Location
                </Link>
              </li>
            </ul>
          </div>

          {/* Solapur Direct Contact */}
          <div className="space-y-3">
            <h4 className="font-label-md font-bold text-on-surface text-sm">Direct Contact</h4>
            <div className="space-y-2 text-slate-600 text-sm">
              <p className="flex items-center gap-2">
                <span className="material-symbols-outlined text-cyan-700 text-base">call</span>
                <a href="tel:+919876543210" className="hover:text-cyan-700 font-semibold">
                  +91 98765 43210
                </a>
              </p>
              <p className="flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-600 text-base">chat</span>
                <a
                  href="https://wa.me/919876543210"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-emerald-700 font-semibold"
                >
                  WhatsApp Booking
                </a>
              </p>
              <p className="flex items-center gap-2 pt-1 text-xs text-slate-500">
                <span className="material-symbols-outlined text-slate-400 text-base">location_on</span>
                <span>Solapur, Maharashtra 413001</span>
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-500 text-center md:text-left">
          <span>© 2026 RepairReach. Reliable service at your doorstep. All rights reserved.</span>
          <div className="flex gap-6">
            <Link to="/contact" className="hover:underline">
              Terms & Conditions
            </Link>
            <Link to="/contact" className="hover:underline">
              Privacy Policy
            </Link>
            <Link to="/contact" className="hover:underline">
              Visiting Charge Policy (₹299)
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

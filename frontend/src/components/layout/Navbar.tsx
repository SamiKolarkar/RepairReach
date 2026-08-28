import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';

export interface NavbarProps {
  onOpenLookup?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenLookup }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // In transactional sub-pages like /booking/:ref or /feedback, check if back button is needed
  const isBookingFlow = location.pathname === '/book';
  const isConfirmationOrFeedback =
    location.pathname.startsWith('/booking/') || location.pathname === '/feedback';

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="bg-white font-manrope fixed top-0 w-full z-50 border-b border-slate-100 shadow-level-2">
      <div className="flex justify-between items-center h-16 px-margin-mobile max-w-[1200px] mx-auto">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          {isConfirmationOrFeedback && (
            <button
              onClick={() => navigate(-1)}
              aria-label="Go back"
              className="text-cyan-700 hover:text-cyan-600 p-2 -ml-2 rounded-full hover:bg-surface-container-low transition-colors min-w-[48px] min-h-[48px] flex items-center justify-center"
            >
              <span className="material-symbols-outlined text-[24px]">arrow_back</span>
            </button>
          )}

          <Link
            to="/"
            className="flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-primary rounded-lg p-1"
          >
            <span
              className="material-symbols-outlined text-cyan-700 text-[28px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              handyman
            </span>
            <span className="text-2xl font-extrabold text-cyan-700 tracking-tight">
              RepairReach
            </span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        {!isBookingFlow ? (
          <nav className="hidden md:flex items-center gap-6">
            <Link
              to="/services"
              className={`font-label-md transition-colors ${
                isActive('/services')
                  ? 'text-cyan-700 font-bold border-b-2 border-cyan-700 pb-0.5'
                  : 'text-slate-600 hover:text-cyan-700'
              }`}
            >
              Services
            </Link>
            <Link
              to="/testimonials"
              className={`font-label-md transition-colors ${
                isActive('/testimonials')
                  ? 'text-cyan-700 font-bold border-b-2 border-cyan-700 pb-0.5'
                  : 'text-slate-600 hover:text-cyan-700'
              }`}
            >
              Reviews
            </Link>
            <Link
              to="/contact"
              className={`font-label-md transition-colors ${
                isActive('/contact')
                  ? 'text-cyan-700 font-bold border-b-2 border-cyan-700 pb-0.5'
                  : 'text-slate-600 hover:text-cyan-700'
              }`}
            >
              Contact
            </Link>
            <Link to="/book">
              <Button size="sm" variant="primary">
                Book Service
              </Button>
            </Link>
          </nav>
        ) : (
          <div className="hidden md:flex items-center gap-4 text-xs font-semibold text-on-surface-variant">
            <span className="flex items-center gap-1 text-emerald-600">
              <span className="material-symbols-outlined text-sm">verified_user</span>
              100% Genuine Parts
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 text-cyan-700">
              <span className="material-symbols-outlined text-sm">bolt</span>
              Fast Solapur Doorstep Service
            </span>
          </div>
        )}

        {/* Right Action Icons & Mobile Toggle */}
        <div className="flex items-center gap-1">
          <button
            onClick={onOpenLookup}
            aria-label="Lookup Booking Reference"
            title="Track Booking Status"
            className="flex items-center justify-center p-2 rounded-full hover:bg-slate-100 text-cyan-700 transition-colors min-w-[48px] min-h-[48px]"
          >
            <span
              className="material-symbols-outlined text-[26px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              account_circle
            </span>
          </button>

          {!isBookingFlow && (
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle mobile menu"
              className="md:hidden flex items-center justify-center p-2 rounded-full hover:bg-slate-100 text-cyan-700 transition-colors min-w-[48px] min-h-[48px]"
            >
              <span className="material-symbols-outlined text-[24px]">
                {mobileMenuOpen ? 'close' : 'menu'}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && !isBookingFlow && (
        <div className="md:hidden bg-white border-b border-slate-200 px-margin-mobile py-4 space-y-3 shadow-lg">
          <Link
            to="/services"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-base font-semibold text-slate-700 hover:text-cyan-700"
          >
            Services
          </Link>
          <Link
            to="/testimonials"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-base font-semibold text-slate-700 hover:text-cyan-700"
          >
            Reviews & Testimonials
          </Link>
          <Link
            to="/contact"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-base font-semibold text-slate-700 hover:text-cyan-700"
          >
            Contact & Operating Hours
          </Link>
          <div className="pt-2">
            <Link to="/book" onClick={() => setMobileMenuOpen(false)}>
              <Button className="w-full" variant="primary">
                Book a Service
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};

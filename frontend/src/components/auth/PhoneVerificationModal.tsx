import React, { useState, useEffect, useRef } from 'react';
import {
  signInWithPhoneNumber,
  RecaptchaVerifier,
  ConfirmationResult,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { translateAuthError } from '@/lib/authErrorTranslator';
import { Modal } from '@/components/ui/Modal';
import { Phone, ArrowRight, ShieldCheck, ArrowLeft, RefreshCw } from 'lucide-react';

export interface PhoneVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified: (phoneNumber: string) => void;
}

export type PhoneVerificationStep = 'PHONE_ENTRY' | 'OTP_ENTRY';

export const PhoneVerificationModal: React.FC<PhoneVerificationModalProps> = ({
  isOpen,
  onClose,
  onVerified,
}) => {
  const [step, setStep] = useState<PhoneVerificationStep>('PHONE_ENTRY');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCountdown, setResendCountdown] = useState(0);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

  // Reset state when modal opens or closes
  useEffect(() => {
    if (!isOpen) {
      setStep('PHONE_ENTRY');
      setPhone('');
      setOtp('');
      setError('');
      setLoading(false);
      setResendCountdown(0);
      setConfirmationResult(null);
    }
  }, [isOpen]);

  // Resend countdown timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCountdown > 0) {
      timer = setTimeout(() => {
        setResendCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [resendCountdown]);

  // Cleanup reCAPTCHA verifier on unmount
  useEffect(() => {
    return () => {
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
        } catch {
          // Ignore cleanup errors
        }
        recaptchaVerifierRef.current = null;
      }
    };
  }, []);

  const getOrCreateRecaptchaVerifier = (): RecaptchaVerifier => {
    if (recaptchaVerifierRef.current) {
      return recaptchaVerifierRef.current;
    }

    const verifier = new RecaptchaVerifier(auth, 'modal-recaptcha-container', {
      size: 'invisible',
      callback: () => {
        // reCAPTCHA solved automatically
      },
      'expired-callback': () => {
        setError('Security verification expired. Please try again.');
        if (recaptchaVerifierRef.current) {
          try {
            recaptchaVerifierRef.current.clear();
          } catch {
            // Ignore
          }
          recaptchaVerifierRef.current = null;
        }
      },
    });

    recaptchaVerifierRef.current = verifier;
    return verifier;
  };

  const normalizePhone = (input: string): string => {
    const clean = input.replace(/\D/g, '');
    if (clean.startsWith('91') && clean.length === 12) {
      return clean.slice(2);
    }
    if (clean.startsWith('0') && clean.length === 11) {
      return clean.slice(1);
    }
    return clean;
  };

  const handleSendOtp = async (isResend = false) => {
    setError('');
    const cleanPhone = normalizePhone(phone);

    if (!cleanPhone || cleanPhone.length !== 10 || !/^[6-9]\d{9}$/.test(cleanPhone)) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setLoading(true);
    const formattedPhone = `+91${cleanPhone}`;

    try {
      const verifier = getOrCreateRecaptchaVerifier();
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, verifier);
      setConfirmationResult(confirmation);
      setStep('OTP_ENTRY');
      setResendCountdown(30);
      if (isResend) {
        setOtp('');
      }
    } catch (err) {
      setError(translateAuthError(err));
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
        } catch {
          // Ignore
        }
        recaptchaVerifierRef.current = null;
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanOtp = otp.trim();
    if (!cleanOtp || cleanOtp.length !== 6 || !/^\d{6}$/.test(cleanOtp)) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    if (!confirmationResult) {
      setError('Verification session expired. Please request a new code.');
      setStep('PHONE_ENTRY');
      return;
    }

    setLoading(true);

    try {
      await confirmationResult.confirm(cleanOtp);
      const cleanPhone = normalizePhone(phone);
      const formattedPhone = `+91${cleanPhone}`;
      onVerified(formattedPhone);
      onClose();
    } catch (err) {
      setError(translateAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleChangeNumber = () => {
    setStep('PHONE_ENTRY');
    setOtp('');
    setError('');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="md" showCloseButton={true}>
      <div className="w-full">
        {/* Invisible reCAPTCHA Container */}
        <div id="modal-recaptcha-container"></div>

        {/* Modal Header */}
        <div className="text-center mb-6">
          <div className="bg-teal-50 w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm border border-teal-100">
            {step === 'PHONE_ENTRY' && <Phone className="w-7 h-7 text-teal-700" />}
            {step === 'OTP_ENTRY' && <ShieldCheck className="w-7 h-7 text-teal-700" />}
          </div>

          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">
            {step === 'PHONE_ENTRY' && 'Verify Your Phone Number'}
            {step === 'OTP_ENTRY' && 'Enter Verification Code'}
          </h2>

          <p className="text-slate-500 mt-1.5 text-sm font-medium">
            {step === 'PHONE_ENTRY' &&
              'To proceed with booking, please enter your 10-digit Indian mobile number to receive a verification OTP.'}
            {step === 'OTP_ENTRY' && (
              <span>
                Enter the 6-digit code sent to{' '}
                <span className="font-semibold text-slate-700">+91 {normalizePhone(phone)}</span>
              </span>
            )}
          </p>
        </div>

        {/* Error Alert Box */}
        {error && (
          <div
            role="alert"
            className="mb-5 bg-red-50 border border-red-200 rounded-xl p-3.5 flex items-start space-x-3 animate-fade-in shadow-sm"
          >
            <div className="flex-shrink-0 mt-0.5">
              <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm text-red-700 font-medium leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        {/* Step 1: PHONE_ENTRY Form */}
        {step === 'PHONE_ENTRY' && (
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              handleSendOtp();
            }}
            className="space-y-4"
          >
            <div>
              <label htmlFor="modal-phone" className="block text-slate-700 text-sm font-semibold mb-1.5 text-left">
                Mobile Number
              </label>
              <div className="relative flex rounded-xl border border-slate-200 bg-slate-50 focus-within:bg-white focus-within:ring-2 focus-within:ring-teal-500 focus-within:border-transparent transition-all overflow-hidden">
                <div className="flex items-center justify-center px-3.5 bg-slate-100 border-r border-slate-200 text-slate-600 font-bold text-sm select-none">
                  🇮🇳 +91
                </div>
                <input
                  id="modal-phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (error) setError('');
                  }}
                  className="block w-full py-3 px-3.5 bg-transparent text-slate-900 placeholder-slate-400 focus:outline-none text-base font-medium"
                  placeholder="98765 43210"
                  maxLength={15}
                  required
                />
              </div>
              <p className="text-xs text-slate-400 mt-1.5 text-left">
                We'll send a 6-digit SMS verification code
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || !phone.trim()}
              className="group relative w-full flex justify-center items-center py-3.5 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-teal-700 hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md mt-4"
            >
              {loading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Sending OTP...
                </span>
              ) : (
                <>
                  Send OTP
                  <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Step 2: OTP_ENTRY Form */}
        {step === 'OTP_ENTRY' && (
          <form noValidate onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label htmlFor="modal-otp" className="block text-slate-700 text-sm font-semibold mb-1.5 text-left">
                6-Digit Verification Code
              </label>
              <div className="relative">
                <input
                  id="modal-otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setOtp(val);
                    if (error) setError('');
                  }}
                  className="block w-full py-3.5 px-4 text-center tracking-[0.35em] text-2xl font-bold border border-slate-200 rounded-xl text-slate-900 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all bg-slate-50 focus:bg-white"
                  placeholder="••••••"
                  autoFocus
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="group relative w-full flex justify-center items-center py-3.5 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-teal-700 hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md"
            >
              {loading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Verifying...
                </span>
              ) : (
                <>
                  Verify OTP
                  <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>

            {/* Resend Code and Change Number actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-sm">
              <button
                type="button"
                onClick={() => handleSendOtp(true)}
                disabled={loading || resendCountdown > 0}
                className="flex items-center gap-1.5 font-semibold text-teal-700 hover:text-teal-800 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                {resendCountdown > 0 ? `Resend code in ${resendCountdown}s` : 'Resend Code'}
              </button>

              <button
                type="button"
                onClick={handleChangeNumber}
                disabled={loading}
                className="flex items-center gap-1 text-slate-500 hover:text-slate-700 font-medium transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Change Number
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};

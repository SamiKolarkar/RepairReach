import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  signInWithPhoneNumber,
  signInWithPopup,
  GoogleAuthProvider,
  RecaptchaVerifier,
  updateProfile,
  ConfirmationResult,
  User,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { translateAuthError } from '@/lib/authErrorTranslator';
import { Phone, ArrowRight, ShieldCheck, User as UserIcon, Mail, ArrowLeft, RefreshCw } from 'lucide-react';

export type AuthStep = 'PHONE_ENTRY' | 'OTP_ENTRY' | 'PROFILE_COLLECTION';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Determine redirect target path
  const locationState = location.state as { from?: { pathname?: string; search?: string } | string } | null;
  const fromPath =
    typeof locationState?.from === 'string'
      ? locationState.from
      : locationState?.from?.pathname
      ? `${locationState.from.pathname}${locationState.from.search || ''}`
      : '/';

  // Step state machine
  const [step, setStep] = useState<AuthStep>('PHONE_ENTRY');

  // Input states
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');

  // Async & UI states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCountdown, setResendCountdown] = useState(0);

  // Auth objects
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [authUser, setAuthUser] = useState<User | null>(null);

  // RecaptchaVerifier reference
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

  // Countdown timer for OTP resend
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

  // Clean up reCAPTCHA verifier on unmount
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

  /**
   * Initializes or returns the existing invisible RecaptchaVerifier
   */
  const getOrCreateRecaptchaVerifier = (): RecaptchaVerifier => {
    if (recaptchaVerifierRef.current) {
      return recaptchaVerifierRef.current;
    }

    const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      size: 'invisible',
      callback: () => {
        // reCAPTCHA solved automatically
      },
      'expired-callback': () => {
        // Reset verifier if expired
        setError('Security verification expired. Please try again.');
        if (recaptchaVerifierRef.current) {
          try {
            recaptchaVerifierRef.current.clear();
          } catch {
            // ignore
          }
          recaptchaVerifierRef.current = null;
        }
      },
    });

    recaptchaVerifierRef.current = verifier;
    return verifier;
  };

  /**
   * Normalizes Indian mobile phone number into 10 clean digits
   */
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

  /**
   * Step 1: Send OTP to Phone
   */
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
      // Reset reCAPTCHA verifier so next attempt gets a fresh instance
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
        } catch {
          // ignore
        }
        recaptchaVerifierRef.current = null;
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Step 2: Verify SMS OTP
   */
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
      const userCredential = await confirmationResult.confirm(cleanOtp);
      const user = userCredential.user;

      // Check if user has a display name; if not, prompt profile collection
      if (!user.displayName || user.displayName.trim() === '') {
        setAuthUser(user);
        setStep('PROFILE_COLLECTION');
      } else {
        navigate(fromPath, { replace: true });
      }
    } catch (err) {
      setError(translateAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  /**
   * Step 3: Complete Profile (First-time users without displayName)
   */
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedName = fullName.trim();
    if (!trimmedName || trimmedName.length < 2) {
      setError('Please enter your full name (at least 2 characters).');
      return;
    }

    const trimmedEmail = email.trim();
    if (trimmedEmail && !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9]+([.-][a-zA-Z0-9]+)*\.[a-zA-Z]{2,}$/.test(trimmedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);

    try {
      const targetUser = authUser || auth.currentUser;
      if (targetUser) {
        await updateProfile(targetUser, { displayName: trimmedName });
      }
      navigate(fromPath, { replace: true });
    } catch (err) {
      setError(translateAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  /**
   * Google OAuth Popup Sign-In
   */
  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');

    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      navigate(fromPath, { replace: true });
    } catch (err) {
      setError(translateAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  /**
   * Reset back to Phone Entry
   */
  const handleChangeNumber = () => {
    setStep('PHONE_ENTRY');
    setOtp('');
    setError('');
  };

  return (
    <div className="flex flex-col justify-center items-center min-h-[calc(100vh-64px)] bg-slate-50 relative overflow-hidden py-12 px-4">
      {/* Decorative Background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-teal-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-cyan-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse delay-1000"></div>
      </div>

      {/* Hidden reCAPTCHA container */}
      <div id="recaptcha-container"></div>

      <div className="bg-white p-8 md:p-10 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] w-full max-w-md z-10 animate-fade-in border border-slate-100">
        {/* Header Section */}
        <div className="text-center mb-8">
          <div className="bg-teal-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-teal-100">
            {step === 'PHONE_ENTRY' && <Phone className="w-8 h-8 text-teal-700" />}
            {step === 'OTP_ENTRY' && <ShieldCheck className="w-8 h-8 text-teal-700" />}
            {step === 'PROFILE_COLLECTION' && <UserIcon className="w-8 h-8 text-teal-700" />}
          </div>

          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            {step === 'PHONE_ENTRY' && 'Sign in with Phone'}
            {step === 'OTP_ENTRY' && 'Verify Mobile OTP'}
            {step === 'PROFILE_COLLECTION' && 'Complete Your Profile'}
          </h2>

          <p className="text-slate-500 mt-2 text-sm font-medium">
            {step === 'PHONE_ENTRY' &&
              'Enter your 10-digit Indian mobile number to receive a verification code'}
            {step === 'OTP_ENTRY' && (
              <span>
                Enter the 6-digit code sent to{' '}
                <span className="font-semibold text-slate-700">+91 {normalizePhone(phone)}</span>
              </span>
            )}
            {step === 'PROFILE_COLLECTION' &&
              'Please provide your details to finish setting up your account'}
          </p>
        </div>

        {/* Error Alert Box */}
        {error && (
          <div
            role="alert"
            className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start space-x-3 animate-fade-in shadow-sm"
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
            className="space-y-5"
          >
            <div>
              <label htmlFor="phone" className="block text-slate-700 text-sm font-semibold mb-2 text-left">
                Phone Number
              </label>
              <div className="relative flex rounded-xl border border-slate-200 bg-slate-50 focus-within:bg-white focus-within:ring-2 focus-within:ring-teal-500 focus-within:border-transparent transition-all overflow-hidden">
                <div className="flex items-center justify-center px-4 bg-slate-100 border-r border-slate-200 text-slate-600 font-bold text-sm select-none">
                  🇮🇳 +91
                </div>
                <input
                  id="phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (error) setError('');
                  }}
                  className="block w-full py-3 px-4 bg-transparent text-slate-900 placeholder-slate-400 focus:outline-none text-base font-medium"
                  placeholder="98765 43210"
                  maxLength={15}
                  required
                />
              </div>
              <p className="text-xs text-slate-400 mt-1.5 text-left">
                We'll send a 6-digit SMS code to verify your phone number
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || !phone.trim()}
              className="group relative w-full flex justify-center items-center py-3.5 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-teal-700 hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md mt-6"
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

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-3 bg-white text-slate-400 font-medium">or continue with</span>
              </div>
            </div>

            {/* Google OAuth Button */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-3.5 px-4 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </button>
          </form>
        )}

        {/* Step 2: OTP_ENTRY Form */}
        {step === 'OTP_ENTRY' && (
          <form noValidate onSubmit={handleVerifyOtp} className="space-y-5">
            <div>
              <label htmlFor="otp" className="block text-slate-700 text-sm font-semibold mb-2 text-left">
                6-Digit Verification Code
              </label>
              <div className="relative">
                <input
                  id="otp"
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

        {/* Step 3: PROFILE_COLLECTION Form */}
        {step === 'PROFILE_COLLECTION' && (
          <form noValidate onSubmit={handleProfileSubmit} className="space-y-5">
            <div>
              <label htmlFor="name" className="block text-slate-700 text-sm font-semibold mb-2 text-left">
                Full Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <UserIcon className="h-5 w-5" />
                </div>
                <input
                  id="name"
                  type="text"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    if (error) setError('');
                  }}
                  className="block w-full pl-11 pr-4 py-3.5 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all bg-slate-50 focus:bg-white text-base"
                  placeholder="e.g. Sarah Jenkins"
                  autoFocus
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-slate-700 text-sm font-semibold mb-2 text-left">
                Email Address <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-5 w-5" />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError('');
                  }}
                  className="block w-full pl-11 pr-4 py-3.5 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all bg-slate-50 focus:bg-white text-base"
                  placeholder="you@example.com"
                />
              </div>
              <p className="text-xs text-slate-400 mt-1.5 text-left">
                Used for sending booking confirmation receipts
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || !fullName.trim() || fullName.trim().length < 2}
              className="group relative w-full flex justify-center items-center py-3.5 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-teal-700 hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md mt-6"
            >
              {loading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving Profile...
                </span>
              ) : (
                <>
                  Complete Profile
                  <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;

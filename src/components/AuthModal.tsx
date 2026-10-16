import React, { useState, useEffect } from 'react';
import {
  Mail,
  Lock,
  Phone,
  Shield,
  ArrowRight,
  AlertCircle,
  CheckCircle,
  HelpCircle,
  KeyRound,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { User } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: User, token: string) => void;
  initialMode?: 'login' | 'register' | 'admin';
  initialReferralCode?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
  initialMode = 'login',
  initialReferralCode = '',
}) => {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot' | 'admin-setup'>(
    initialMode === 'admin' ? 'login' : initialMode
  );

  // Form states
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [identifier, setIdentifier] = useState(''); // Keep empty so user inputs admin email manually
  const [password, setPassword] = useState(initialMode === 'admin' ? 'Admin@Boya2026!' : '');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referralCode, setReferralCode] = useState(initialReferralCode);
  const [adminSetupKey, setAdminSetupKey] = useState('');

  // Auto-save login & password state
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [hasSavedCreds, setHasSavedCreds] = useState(false);

  // UI state
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [forgotNotice, setForgotNotice] = useState<string | null>(null);

  // Synchronize modal state on open or mode change
  useEffect(() => {
    if (!isOpen) return;

    setErrorMessage(null);
    setForgotNotice(null);

    if (initialMode === 'admin') {
      setMode('login');
      setIdentifier(''); // Keep empty so user inputs admin email manually
      setPassword('Admin@Boya2026!');
      setSuccessMessage('Admin master password auto-filled. Please input your administrator email manually.');
      return;
    }

    if (initialMode === 'register') {
      setMode('register');
      setReferralCode(initialReferralCode || '');
      setSuccessMessage(null);
      return;
    }

    // Default / login mode: automatically restore saved user login & password
    setMode('login');
    try {
      const saved = localStorage.getItem('boya_saved_user_creds');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.identifier && parsed?.password) {
          setIdentifier(parsed.identifier);
          setPassword(parsed.password);
          setHasSavedCreds(true);
          setSuccessMessage('Your saved login and password have been auto-filled.');
          return;
        }
      }
    } catch (e) {
      // ignore JSON parse errors
    }

    setHasSavedCreds(false);
    setIdentifier('');
    setPassword('');
    setSuccessMessage(null);
  }, [isOpen, initialMode, initialReferralCode]);

  const clearSavedCreds = () => {
    try {
      localStorage.removeItem('boya_saved_user_creds');
      setHasSavedCreds(false);
      if (password !== 'Admin@Boya2026!') {
        setIdentifier('');
        setPassword('');
      }
      setSuccessMessage('Saved credentials cleared from this browser.');
    } catch (e) {
      // ignore
    }
  };

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to authenticate.');
      }

      // Automatically save user login and password to localStorage
      if (autoSaveEnabled && identifier.trim()) {
        try {
          localStorage.setItem(
            'boya_saved_user_creds',
            JSON.stringify({
              identifier: identifier.trim(),
              password,
              savedAt: new Date().toISOString(),
            })
          );
        } catch (e) {
          console.error('Failed to auto-save credentials', e);
        }
      } else if (!autoSaveEnabled) {
        localStorage.removeItem('boya_saved_user_creds');
      }

      onAuthSuccess(data.user, data.token);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (password !== confirmPassword) {
      setErrorMessage('Password confirmation does not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, phone, password, confirmPassword, referralCode }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Registration failed.');
      }

      // Auto-save login and password automatically on successful registration
      if (autoSaveEnabled && (email.trim() || phone.trim())) {
        try {
          localStorage.setItem(
            'boya_saved_user_creds',
            JSON.stringify({
              identifier: email.trim() || phone.trim(),
              password,
              savedAt: new Date().toISOString(),
            })
          );
        } catch (e) {
          console.error('Failed to auto-save credentials', e);
        }
      }

      onAuthSuccess(data.user, data.token);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to register account.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setForgotNotice(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier }),
      });
      const data = await res.json();
      setForgotNotice(data.message);
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to process reset request.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      const targetAdminEmail = email.trim() || identifier.trim() || 'admin@boya.com';
      const res = await fetch('/api/admin/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          setupKey: adminSetupKey,
          email: targetAdminEmail,
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Admin setup failed.');

      setSuccessMessage(data.message + ' Please enter your email address to log in.');
      setMode('login');
    } catch (err: any) {
      setErrorMessage(err.message || 'Admin setup verification failed.');
    } finally {
      setLoading(false);
    }
  };

  // Quick fill helper for admin credential: ONLY password auto-fills, email is input manually
  const fillTestAdmin = () => {
    setPassword('Admin@Boya2026!');
    setIdentifier(''); // Crucial: email must be input manually
    setSuccessMessage('Admin master password auto-filled. Please input your administrator email manually.');
    setErrorMessage(null);
  };

  const fillTestUser = () => {
    const rand = Math.floor(1000 + Math.random() * 9000);
    const demoEmail = `investor${rand}@boya.com`;
    setEmail(demoEmail);
    setPhone(`+1800555${rand}`);
    setPassword('Investor123!');
    setConfirmPassword('Investor123!');
    setErrorMessage(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-md my-8 rounded-2xl bg-[#091124] border border-amber-500/30 p-6 sm:p-8 shadow-2xl shadow-amber-500/10">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg bg-slate-800/50 hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Brand Header */}
        <div className="text-center mb-6">
          <BrandLogo size="lg" showSubtitle={true} />
          <p className="text-xs text-slate-400 mt-2">
            {mode === 'login' && 'Sign in with your email or mobile phone'}
            {mode === 'register' && 'Create your private financial investment account'}
            {mode === 'forgot' && 'Reset your password'}
            {mode === 'admin-setup' && 'First-Time Administrator Setup Portal'}
          </p>
        </div>

        {/* Alert Banners */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2">
            <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Auto-saved notification badge when credentials were automatically restored */}
        {mode === 'login' && hasSavedCreds && password !== 'Admin@Boya2026!' && (
          <div className="mb-4 py-2 px-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Save className="w-3.5 h-3.5 text-amber-400" />
              <span>Login & password auto-saved on this device</span>
            </div>
            <button
              type="button"
              onClick={clearSavedCreds}
              className="text-[10px] text-slate-400 hover:text-rose-400 flex items-center gap-1 transition"
              title="Remove saved credentials"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear</span>
            </button>
          </div>
        )}

        {/* ================================================================= */}
        {/* LOGIN FORM */}
        {/* ================================================================= */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} method="POST" action="#" autoComplete="on" className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-medium text-slate-300">
                  Email Address or Mobile Phone
                </label>
                {hasSavedCreds && (
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 rounded-md">
                    Auto-Saved
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type="text"
                  name="username"
                  id="user-login-identifier"
                  autoComplete="username"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="name@domain.com or mobile phone"
                  className="w-full py-2.5 px-3.5 pl-10 rounded-xl bg-slate-900 border border-slate-700 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 text-sm text-white placeholder-slate-500 outline-none transition"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-medium text-slate-300 flex items-center gap-1.5">
                  <span>Password</span>
                  {hasSavedCreds && (
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 rounded-md">
                      Auto-Saved
                    </span>
                  )}
                </label>
                <button
                  type="button"
                  onClick={() => setMode('forgot')}
                  className="text-xs text-amber-400 hover:text-amber-300 transition"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  type="password"
                  name="password"
                  id="user-login-password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full py-2.5 px-3.5 pl-10 rounded-xl bg-slate-900 border border-slate-700 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 text-sm text-white placeholder-slate-500 outline-none transition"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              </div>
            </div>

            {/* User auto-save login and password toggle */}
            <div className="flex items-center justify-between text-xs py-1 px-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
              <label className="flex items-center gap-2 cursor-pointer select-none text-slate-300 text-[11px]">
                <input
                  type="checkbox"
                  checked={autoSaveEnabled}
                  onChange={(e) => setAutoSaveEnabled(e.target.checked)}
                  className="rounded border-slate-700 text-amber-500 focus:ring-amber-400 bg-slate-900 w-3.5 h-3.5"
                />
                <span>Auto-save login and password automatically</span>
              </label>
              {hasSavedCreds && (
                <button
                  type="button"
                  onClick={clearSavedCreds}
                  className="text-[10px] text-slate-400 hover:text-rose-400 hover:underline"
                >
                  Clear saved
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 text-slate-950 hover:brightness-110 active:scale-[0.98] transition flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
            >
              {loading ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>Sign In to BOYA</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="text-center pt-3 text-xs text-slate-400">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => setMode('register')}
                className="font-bold text-amber-400 hover:underline"
              >
                Register Here
              </button>
            </div>
          </form>
        )}

        {/* ================================================================= */}
        {/* REGISTRATION FORM */}
        {/* ================================================================= */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} method="POST" action="#" autoComplete="on" className="space-y-3.5">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  name="email"
                  id="user-register-email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="yourname@gmail.com"
                  className="w-full py-2.5 px-3 pl-9 rounded-xl bg-slate-900 border border-slate-700 focus:border-amber-400 text-xs text-white placeholder-slate-500 outline-none"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Mobile Phone Number (Optional)
              </label>
              <div className="relative">
                <input
                  type="tel"
                  name="tel"
                  id="user-register-tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 234-5678 (Optional)"
                  className="w-full py-2.5 px-3 pl-9 rounded-xl bg-slate-900 border border-slate-700 focus:border-amber-400 text-xs text-white placeholder-slate-500 outline-none"
                />
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  name="new-password"
                  id="user-register-password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 chars"
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-900 border border-slate-700 focus:border-amber-400 text-xs text-white placeholder-slate-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  name="confirm-password"
                  id="user-register-confirm"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat"
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-900 border border-slate-700 focus:border-amber-400 text-xs text-white placeholder-slate-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Referral Code (Optional)
              </label>
              <input
                type="text"
                name="referral"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value)}
                placeholder="e.g. BY123456"
                className="w-full py-2 px-3 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white uppercase placeholder-slate-500 outline-none"
              />
            </div>

            {/* Auto-save login on registration */}
            <div className="py-1 px-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
              <label className="flex items-center gap-2 cursor-pointer select-none text-slate-300 text-[11px]">
                <input
                  type="checkbox"
                  checked={autoSaveEnabled}
                  onChange={(e) => setAutoSaveEnabled(e.target.checked)}
                  className="rounded border-slate-700 text-amber-500 focus:ring-amber-400 bg-slate-900 w-3.5 h-3.5"
                />
                <span>Auto-save login and password automatically</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 text-slate-950 hover:brightness-110 active:scale-[0.98] transition flex items-center justify-center gap-2 shadow-lg"
            >
              {loading ? 'Creating Account...' : 'Complete Registration'}
            </button>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-xs text-slate-400 hover:text-white"
              >
                Already have an account? <span className="font-bold text-amber-400 hover:underline">Sign In</span>
              </button>
            </div>
          </form>
        )}

        {/* ================================================================= */}
        {/* FORGOT PASSWORD */}
        {/* ================================================================= */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Registered Email or Phone
              </label>
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="name@domain.com or phone"
                className="w-full py-2.5 px-3.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white outline-none"
              />
            </div>

            {forgotNotice && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs">
                <p className="font-semibold mb-1 flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                  Provider Configuration Notice:
                </p>
                <p>{forgotNotice}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl font-bold text-xs bg-amber-500 text-slate-950 hover:bg-amber-400 transition"
            >
              {loading ? 'Verifying...' : 'Request Verification PIN'}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-xs text-slate-400 hover:text-white"
              >
                Return to Login
              </button>
            </div>
          </form>
        )}

        {/* ================================================================= */}
        {/* ADMIN MASTER SETUP KEY */}
        {/* ================================================================= */}
        {mode === 'admin-setup' && (
          <form onSubmit={handleAdminSetup} className="space-y-4">
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300">
              <span className="font-bold">Authorized Admin Console:</span> Master Root Activation
              <p className="text-[11px] text-slate-300 mt-1">
                Configure master credentials securely. Administrator email is hidden for privacy.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Administrator Email (Enter Manually)
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter administrator email manually..."
                  className="w-full py-2.5 px-3 pl-9 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white outline-none"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Admin Setup Key
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={adminSetupKey}
                  onChange={(e) => setAdminSetupKey(e.target.value)}
                  placeholder="Enter ADMIN_SETUP_KEY"
                  className="w-full py-2.5 px-3 pl-9 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white outline-none"
                />
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Set Administrator Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="New strong password"
                className="w-full py-2.5 px-3 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl font-bold text-xs bg-amber-500 text-slate-950 hover:bg-amber-400 transition"
            >
              {loading ? 'Configuring...' : 'Verify Key & Activate Admin'}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-xs text-slate-400 hover:text-white"
              >
                Back to Standard Login
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

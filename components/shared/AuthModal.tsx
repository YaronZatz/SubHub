'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  validateAuthEmail,
  validateAuthPassword,
  validateAuthName,
} from '@/utils/listingValidation';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AuthModalReason = 'save' | 'contact' | 'general';

interface AuthModalProps {
  onClose: () => void;
  /** Called immediately after successful sign-in/sign-up, before onClose. */
  onSuccess?: () => void;
  reason?: AuthModalReason;
  initialMode?: 'signup' | 'login';
}

// ─── Copy map ─────────────────────────────────────────────────────────────────

const COPY: Record<AuthModalReason, { title: string; subtitle: string }> = {
  save: {
    title: 'Sign up to save this listing',
    subtitle: 'Keep your favourites in one place — free forever.',
  },
  contact: {
    title: 'Sign up to contact landlords',
    subtitle: 'Reach out directly. No middlemen, no fees.',
  },
  general: {
    title: 'Join SubHub',
    subtitle: 'Find your next place with AI-powered search.',
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function AuthModal({
  onClose,
  onSuccess,
  reason = 'general',
  initialMode = 'signup',
}: AuthModalProps) {
  const { login, signup, loginWithGoogle } = useAuth();

  type View = 'main' | 'email';
  type FormMode = 'signup' | 'login';

  const [view, setView] = useState<View>(initialMode === 'login' ? 'email' : 'main');
  const [formMode, setFormMode] = useState<FormMode>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const copy = COPY[reason];

  const handleSuccess = () => {
    onSuccess?.();
    onClose();
  };

  // ── Google ────────────────────────────────────────────────────────────────

  const handleGoogle = async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await loginWithGoogle();
      if (result.success) {
        handleSuccess();
      } else {
        setError(result.error || 'Google sign-in failed. Please try again.');
      }
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  // ── Email form ────────────────────────────────────────────────────────────

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const emailErr = validateAuthEmail(email);
    if (emailErr) { setError(emailErr); return; }

    const passErr = validateAuthPassword(password);
    if (passErr) { setError(passErr); return; }

    if (formMode === 'signup') {
      const nameErr = validateAuthName(name);
      if (nameErr) { setError(nameErr); return; }
    }

    setLoading(true);
    try {
      const result = formMode === 'signup'
        ? await signup(name.trim(), email.trim(), password)
        : await login(email.trim(), password);

      if (result.success) {
        handleSuccess();
      } else {
        setError(result.error || 'Authentication failed. Please try again.');
      }
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const switchFormMode = (mode: FormMode) => {
    setFormMode(mode);
    setError(null);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 fade-in duration-200">

        {/* Close button */}
        <div className="flex justify-end pt-4 pr-4">
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-8 pb-8 pt-1">

          {/* Logo */}
          <div className="flex justify-center mb-5">
            <img src="/logo.png" alt="SubHub" className="h-12 w-auto" />
          </div>

          {/* Heading */}
          <div className="text-center mb-6">
            <h2 className="text-xl font-black text-slate-900 leading-snug">
              {view === 'email' && formMode === 'login' ? 'Welcome back' : copy.title}
            </h2>
            {!(view === 'email' && formMode === 'login') && (
              <p className="text-sm text-slate-500 mt-1">{copy.subtitle}</p>
            )}
          </div>

          {/* ── Main view ── */}
          {view === 'main' && (
            <div className="space-y-3">

              {/* Google — primary */}
              <button
                onClick={handleGoogle}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-3.5 px-4 bg-white border-2 border-slate-200 rounded-2xl font-bold text-sm text-slate-800 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 transition-all shadow-sm active:scale-[0.98]"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                ) : (
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                )}
                Continue with Google
              </button>

              {/* Email — secondary */}
              <button
                onClick={() => { setView('email'); setFormMode('signup'); }}
                className="w-full py-3.5 px-4 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-slate-800 transition-colors active:scale-[0.98]"
              >
                Continue with Email
              </button>

              {/* Sign in link */}
              <p className="text-center text-sm text-slate-500 pt-1">
                Already have an account?{' '}
                <button
                  onClick={() => { setView('email'); setFormMode('login'); }}
                  className="text-[#4A7CC7] font-bold hover:underline"
                >
                  Sign in
                </button>
              </p>

              {/* Tagline */}
              <p className="text-center text-xs text-slate-400 pt-1">
                Takes 10 seconds. Free forever.
              </p>
            </div>
          )}

          {/* ── Email form view ── */}
          {view === 'email' && (
            <div className="space-y-3">

              {/* Mode toggle */}
              <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
                <button
                  type="button"
                  onClick={() => switchFormMode('signup')}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${
                    formMode === 'signup'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Sign up
                </button>
                <button
                  type="button"
                  onClick={() => switchFormMode('login')}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${
                    formMode === 'login'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Log in
                </button>
              </div>

              <form onSubmit={handleEmailSubmit} className="space-y-2.5">
                {formMode === 'signup' && (
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Full name"
                    autoComplete="name"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#4A7CC7]/20 focus:border-[#4A7CC7] transition-all"
                  />
                )}

                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Email address"
                  autoComplete="email"
                  required
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#4A7CC7]/20 focus:border-[#4A7CC7] transition-all"
                />

                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Password"
                  autoComplete={formMode === 'signup' ? 'new-password' : 'current-password'}
                  required
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#4A7CC7]/20 focus:border-[#4A7CC7] transition-all"
                />

                {error && (
                  <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs font-semibold border border-red-100">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-[#4A7CC7] text-white rounded-2xl font-black text-sm hover:bg-[#3b66a6] disabled:opacity-50 transition-all shadow-lg shadow-[#4A7CC7]/20 active:scale-[0.98]"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                  ) : (
                    formMode === 'signup' ? 'Create account' : 'Sign in'
                  )}
                </button>
              </form>

              {/* Back to other options */}
              <button
                onClick={() => { setView('main'); setError(null); }}
                className="w-full text-center text-xs text-slate-400 hover:text-slate-600 transition-colors pt-1"
              >
                ← Other sign-in options
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { authService } from '../services/authService';
import { firebaseConfig } from '../firebase/config';
import {
  ShieldCheck,
  ArrowRight,
  AlertCircle,
  Sparkles,
  Building2,
  FileCheck,
  ExternalLink,
  Mail,
  KeyRound,
} from 'lucide-react';

interface LoginProps {
  onSuccess: () => void;
  onNavigateAdmin?: () => void;
}

export const Login: React.FC<LoginProps> = ({ onSuccess, onNavigateAdmin }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUnauthorizedDomain, setIsUnauthorizedDomain] = useState(false);
  const [authorizedEmailInput, setAuthorizedEmailInput] = useState('');
  const [showDirectAuth, setShowDirectAuth] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      setIsUnauthorizedDomain(false);
      await authService.signInWithGoogle();
      onSuccess();
    } catch (err: any) {
      console.error('Sign in error:', err);
      const errMsg = err?.message || String(err);
      if (
        errMsg.includes('unauthorized-domain') ||
        err?.code === 'auth/unauthorized-domain'
      ) {
        setIsUnauthorizedDomain(true);
        setError(
          `Firebase Domain Not Authorized (auth/unauthorized-domain): Your current domain (localhost / 127.0.0.1) has not been added to the Firebase Console Authorized Domains list for project "${firebaseConfig.projectId}".`
        );
      } else {
        setError(
          errMsg ||
            'Access Denied: Your account has not been added by an administrator. Self-registration is strictly disabled until an admin adds your email to the authorized roster.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDirectAuthorizedSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authorizedEmailInput.trim()) {
      setError('Please enter your email address.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await authService.signInWithAuthorizedEmail(authorizedEmailInput.trim());
      onSuccess();
    } catch (err: any) {
      console.error('Direct auth error:', err);
      setError(err?.message || 'Access Denied: Email not authorized by administrator.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col justify-center items-center px-4 sm:px-6 py-12">
      <div className="w-full max-w-md bg-white border border-neutral-200 shadow-sm rounded-xl p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-neutral-900 text-white mb-2 shadow-xs">
            <Building2 className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
            Job Application Portal
          </h1>
          <p className="text-sm text-neutral-600 font-medium">Candidate Job Opportunities & AI Resumes</p>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold mt-1">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
            <span>Strictly Invite-Only</span>
          </div>
        </div>

        {/* Self-registration disabled banner */}
        <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-lg text-xs text-neutral-600 leading-relaxed">
          <strong className="text-neutral-900 block font-semibold mb-0.5">Registration Policy:</strong>
          Self-registration is disabled. Candidates cannot sign up until an administrator adds their email address to the authorized allowlist.
        </div>

        {error && (
          <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm space-y-2">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-600" />
              <div>
                <p className="font-semibold text-red-900">
                  {isUnauthorizedDomain ? 'Firebase Domain Configuration' : 'Access Denied'}
                </p>
                <p className="text-xs mt-0.5 text-red-700 leading-relaxed">{error}</p>
              </div>
            </div>

            {isUnauthorizedDomain && (
              <div className="pt-2 border-t border-red-200/60 space-y-2 text-xs">
                <p className="text-neutral-700 font-medium">
                  <strong>How to fix in Firebase:</strong>
                </p>
                <ol className="list-decimal list-inside space-y-1 text-neutral-600">
                  <li>Open Firebase Console for this project</li>
                  <li>Go to <strong>Authentication &gt; Settings &gt; Authorized domains</strong></li>
                  <li>Add <strong>localhost</strong> and <strong>127.0.0.1</strong></li>
                </ol>
                <a
                  href={`https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/settings`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-900 underline hover:text-black mt-1"
                >
                  <span>Open Firebase Console Authorized Domains</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>
        )}

        {/* Primary Google Sign-In */}
        <div className="space-y-3">
          <button
            id="google-signin-btn"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-neutral-300 rounded-lg text-neutral-800 font-medium bg-white hover:bg-neutral-50 hover:border-neutral-400 transition-colors shadow-xs disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span className="font-semibold text-xs sm:text-sm">
              {loading ? 'Verifying Authorization...' : 'Sign In with Authorized Google Account'}
            </span>
          </button>

          {/* Quick fallback toggle: Authorized Email verification */}
          <div className="text-center">
            <button
              type="button"
              onClick={() => setShowDirectAuth(!showDirectAuth)}
              className="text-xs text-neutral-500 hover:text-neutral-900 underline transition-colors cursor-pointer"
            >
              {showDirectAuth
                ? 'Hide direct email sign-in'
                : 'Having Google popup domain issues? Sign in with authorized email'}
            </button>
          </div>

          {/* Direct Authorized Email Form (strictly verifies admin whitelist) */}
          {showDirectAuth && (
            <form
              onSubmit={handleDirectAuthorizedSignIn}
              className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-3 animate-fade-in"
            >
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Your Authorized Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
                  <input
                    id="direct-auth-email-input"
                    type="email"
                    placeholder="you@example.com"
                    value={authorizedEmailInput}
                    onChange={e => setAuthorizedEmailInput(e.target.value)}
                    required
                    className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                  />
                </div>
                <p className="text-[11px] text-neutral-400 mt-1">
                  Must be added by an admin. Unauthorized emails are rejected.
                </p>
              </div>

              <button
                type="submit"
                id="direct-auth-submit-btn"
                disabled={loading}
                className="w-full py-2 px-3 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Sign In with Whitelisted Email'}
              </button>
            </form>
          )}
        </div>


        <div className="border-t border-neutral-100 pt-4 space-y-2 text-xs text-neutral-500">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-neutral-400" />
            <span>AI tailored resume generation for every role</span>
          </div>
          <div className="flex items-center gap-2">
            <FileCheck className="w-3.5 h-3.5 text-neutral-400" />
            <span>Automatic location matching and application tracking</span>
          </div>
        </div>

        {/* Administrator Portal Entry Link */}
        <div className="border-t border-neutral-100 pt-3 text-center">
          <button
            type="button"
            onClick={() => {
              if (onNavigateAdmin) {
                onNavigateAdmin();
              } else {
                window.location.href = '/admin';
              }
            }}
            className="text-xs text-neutral-500 hover:text-neutral-900 transition-colors underline cursor-pointer"
          >
            System Administrator? Go to Admin Console (/admin)
          </button>
        </div>
      </div>
    </div>
  );
};

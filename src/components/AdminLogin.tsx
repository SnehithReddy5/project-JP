import React, { useState } from 'react';
import { authService } from '../services/authService';
import { ShieldCheck, Lock, User, Eye, EyeOff, AlertCircle, ArrowLeft, Building2 } from 'lucide-react';

interface AdminLoginProps {
  onLoginSuccess: (username: string) => void;
  onNavigateCandidate?: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({
  onLoginSuccess,
  onNavigateCandidate,
}) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const isValid = authService.verifyAdminCredentials(username, password);
      if (isValid) {
        authService.setAdminSession(username);
        onLoginSuccess(username);
      } else {
        setError('Invalid username or password. Please verify your administrator credentials.');
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleAdminSignIn = async () => {
    try {
      setGoogleLoading(true);
      setError(null);
      const res = await authService.signInWithGoogle();
      const email = res.user.email || '';
      if (authService.isAdminEmail(email)) {
        authService.setAdminSession(email);
        onLoginSuccess(email);
      } else {
        setError(`The Google account (${email}) is not recognized as an administrator.`);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to authenticate administrator via Google.');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-100 flex flex-col justify-center items-center px-4 sm:px-6 py-12">
      <div className="w-full max-w-md bg-neutral-950 border border-neutral-800 shadow-2xl rounded-2xl p-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-neutral-800 border border-neutral-700 text-white mb-2 shadow-inner">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Administrator Portal</h1>
          <p className="text-xs text-neutral-400 font-medium">
            Restricted Back-Office Console — Authorized Personnel Only
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 rounded-lg bg-red-950/60 border border-red-800 text-red-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
            <div className="leading-relaxed">
              <span className="font-semibold block text-red-200">Authentication Error</span>
              {error}
            </div>
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-neutral-300">
              Admin Username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
                <User className="w-4 h-4" />
              </div>
              <input
                id="admin-username-input"
                type="text"
                required
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="admin"
                className="w-full pl-9 pr-3 py-2.5 bg-neutral-900 border border-neutral-700 rounded-lg text-sm text-white placeholder-neutral-500 focus:outline-hidden focus:border-neutral-400 transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-neutral-300">
                Password
              </label>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="admin-password-input"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-9 pr-10 py-2.5 bg-neutral-900 border border-neutral-700 rounded-lg text-sm text-white placeholder-neutral-500 focus:outline-hidden focus:border-neutral-400 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-200 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            id="admin-login-submit"
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 px-4 bg-white text-neutral-950 font-semibold text-sm rounded-lg hover:bg-neutral-200 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
          >
            {submitting ? 'Authenticating...' : 'Sign In as Administrator'}
          </button>
        </form>

        {/* Credentials helper hint */}
        <div className="p-3 bg-neutral-900/90 border border-neutral-800 rounded-lg text-xs text-neutral-400 space-y-1">
          <p className="font-semibold text-neutral-300">System Credentials Hint:</p>
          <p className="text-[11px] font-mono text-neutral-400">
            Username: <span className="text-white">admin</span> &nbsp;|&nbsp; Password: <span className="text-white">admin123</span>
          </p>
        </div>

        {/* Divider */}
        <div className="relative flex py-1 items-center">
          <div className="grow border-t border-neutral-800"></div>
          <span className="shrink mx-3 text-xs text-neutral-500 uppercase tracking-wider font-semibold">Or</span>
          <div className="grow border-t border-neutral-800"></div>
        </div>

        {/* Alternative: Google Admin Sign In */}
        <button
          type="button"
          onClick={handleGoogleAdminSignIn}
          disabled={googleLoading}
          className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 rounded-lg text-xs font-medium text-neutral-200 transition-colors cursor-pointer"
        >
          <Building2 className="w-4 h-4 text-emerald-400" />
          <span>{googleLoading ? 'Connecting...' : 'Connect Admin Google Account'}</span>
        </button>

        {/* Return to Candidate portal */}
        <div className="pt-2 text-center">
          <button
            id="back-to-candidate-portal"
            type="button"
            onClick={() => {
              if (onNavigateCandidate) {
                onNavigateCandidate();
              } else {
                window.location.href = '/';
              }
            }}
            className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Candidate Job Portal</span>
          </button>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Lock, Mail, ArrowRight, Sparkles, Briefcase, FileCheck2, ShieldAlert } from 'lucide-react';

interface FeatureAccessGateProps {
  featureName: string;
  onNavigateAllowed?: (tab: string) => void;
}

export const FeatureAccessGate: React.FC<FeatureAccessGateProps> = ({
  featureName,
  onNavigateAllowed,
}) => {
  const { user, permissions, signOut } = useAuth();

  // Find first allowed feature to give an immediate jump button
  const firstAllowedTab = permissions.resumeBuilder
    ? 'resumeBuilder'
    : permissions.jobs
    ? 'jobs'
    : permissions.applications
    ? 'applications'
    : null;

  const firstAllowedName = permissions.resumeBuilder
    ? 'Resume Builder'
    : permissions.jobs
    ? 'Job Search'
    : permissions.applications
    ? 'Applications'
    : null;

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="bg-white border border-neutral-200 rounded-2xl max-w-lg w-full p-8 text-center space-y-6 shadow-sm">
        {/* Lock Icon */}
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto shadow-inner">
          <Lock className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-100 text-amber-900 text-xs font-semibold">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-700" />
            <span>Feature Access Restricted</span>
          </div>
          <h2 className="text-xl font-bold text-neutral-900">
            {featureName} is Locked
          </h2>
          <p className="text-xs text-neutral-600 leading-relaxed max-w-md mx-auto">
            Your administrator has provisioned your account (<strong className="text-neutral-900">{user?.email}</strong>) with selective permissions. Access to the <strong className="text-neutral-900">{featureName}</strong> module is currently not enabled.
          </p>
        </div>

        {/* Enabled Features Summary */}
        <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 text-left space-y-2">
          <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider block">
            Your Enabled Access:
          </span>
          <div className="flex flex-wrap gap-2">
            {permissions.resumeBuilder ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-200">
                <Sparkles className="w-3 h-3" />
                Resume Builder (Enabled)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-neutral-200 text-neutral-500 text-xs font-medium">
                <Lock className="w-3 h-3" />
                Resume Builder (Locked)
              </span>
            )}

            {permissions.jobs ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-200">
                <Briefcase className="w-3 h-3" />
                Jobs Portal (Enabled)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-neutral-200 text-neutral-500 text-xs font-medium">
                <Lock className="w-3 h-3" />
                Jobs Portal (Locked)
              </span>
            )}

            {permissions.applications ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-200">
                <FileCheck2 className="w-3 h-3" />
                Applications (Enabled)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-neutral-200 text-neutral-500 text-xs font-medium">
                <Lock className="w-3 h-3" />
                Applications (Locked)
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-2">
          {firstAllowedTab && onNavigateAllowed && (
            <button
              onClick={() => onNavigateAllowed(firstAllowedTab)}
              className="w-full py-2.5 px-4 bg-neutral-900 text-white rounded-xl text-xs font-bold hover:bg-neutral-800 transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Go to {firstAllowedName}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          <a
            href={`mailto:admin@jobportal.com?subject=Access%20Request%20for%20${encodeURIComponent(featureName)}&body=Hello%20Admin,%20Please%20grant%20access%20to%20the%20${encodeURIComponent(featureName)}%20feature%20for%20account%20${encodeURIComponent(user?.email || '')}.`}
            className="w-full py-2.5 px-4 bg-white border border-neutral-300 text-neutral-800 rounded-xl text-xs font-medium hover:bg-neutral-50 transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Mail className="w-3.5 h-3.5 text-neutral-600" />
            <span>Contact Administrator for Access</span>
          </a>

          <button
            onClick={signOut}
            className="text-[11px] text-neutral-400 hover:text-neutral-700 underline cursor-pointer pt-1"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};

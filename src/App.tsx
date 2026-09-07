import React, { useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import { Login } from './pages/Login';
import { ProfileSetup } from './pages/ProfileSetup';
import { Home } from './pages/Home';
import { Jobs } from './pages/Jobs';
import { JobDetails } from './pages/JobDetails';
import { ApplyFlow } from './pages/ApplyFlow';
import { Applications } from './pages/Applications';
import { ResumeBuilder } from './pages/ResumeBuilder';
import { Admin } from './pages/Admin';
import { FirestorePermissionBanner } from './components/FirestorePermissionBanner';
import { FeatureAccessGate } from './components/FeatureAccessGate';
import {
  Briefcase,
  Home as HomeIcon,
  FileCheck2,
  User,
  Shield,
  LogOut,
  Building2,
  Menu,
  X,
  Sparkles,
  Lock,
} from 'lucide-react';

export default function App() {
  const { user, profile, loading, isAuthorized, permissions, signOut } = useAuth();

  // Route & Navigation State
  const [currentPath, setCurrentPath] = useState<string>(() => window.location.pathname);
  const [currentTab, setCurrentTab] = useState<string>('home');
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // Sync browser back/forward history
  React.useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Auto-redirect if candidate is on a feature they don't have access to
  React.useEffect(() => {
    if (user && isAuthorized) {
      if ((currentTab === 'jobs' || currentTab === 'jobDetails' || currentTab === 'apply') && !permissions.jobs) {
        if (permissions.resumeBuilder) setCurrentTab('resumeBuilder');
        else if (permissions.applications) setCurrentTab('applications');
      } else if (currentTab === 'applications' && !permissions.applications) {
        if (permissions.resumeBuilder) setCurrentTab('resumeBuilder');
        else if (permissions.jobs) setCurrentTab('jobs');
      } else if (currentTab === 'resumeBuilder' && !permissions.resumeBuilder) {
        if (permissions.jobs) setCurrentTab('jobs');
        else if (permissions.applications) setCurrentTab('applications');
      } else if (currentTab === 'home' && !permissions.jobs && permissions.resumeBuilder) {
        setCurrentTab('resumeBuilder');
      }
    }
  }, [user, isAuthorized, permissions, currentTab]);

  const navigateToRoute = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Route: Dedicated /admin portal (shows admin username and password login)
  if (currentPath === '/admin' || currentPath.startsWith('/admin')) {
    return (
      <Admin
        onNavigateCandidate={() => {
          navigateToRoute('/');
          setCurrentTab('home');
        }}
      />
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center space-y-3">
        <div className="w-6 h-6 border-2 border-neutral-300 border-t-neutral-900 rounded-full animate-spin" />
        <p className="text-xs text-neutral-500 font-medium">Verifying authorization...</p>
      </div>
    );
  }

  // Gate 1: Candidate Not logged in
  if (!user) {
    return (
      <Login
        onSuccess={() => setCurrentTab('home')}
        onNavigateAdmin={() => navigateToRoute('/admin')}
      />
    );
  }

  // Gate 2: Unauthorized candidate check
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
        <div className="bg-white border border-neutral-200 rounded-xl max-w-md w-full p-8 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
            <Shield className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-neutral-900">Invite-Only Access</h2>
          <p className="text-xs text-neutral-600 leading-relaxed">
            The Google account <strong className="text-neutral-900">{user.email}</strong> has not been added by an administrator.
            Self-registration is disabled until an administrator adds your email to the authorized roster.
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <button
              onClick={signOut}
              className="w-full py-2.5 px-4 border border-neutral-300 rounded-lg text-xs font-medium text-neutral-800 hover:bg-neutral-50 cursor-pointer"
            >
              Sign Out
            </button>
            <button
              onClick={() => navigateToRoute('/admin')}
              className="text-[11px] text-neutral-500 hover:text-neutral-800 underline cursor-pointer"
            >
              Administrator Console Login (/admin)
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Gate 3: First-time profile setup check (Section 9)
  if (!profile) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <header className="bg-white border-b border-neutral-200 py-3 px-6 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-neutral-900 text-sm">
            <Building2 className="w-5 h-5" />
            <span>Job Application Portal</span>
          </div>
          <button
            onClick={signOut}
            className="text-xs text-neutral-600 hover:text-neutral-900 flex items-center gap-1 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </header>
        <ProfileSetup onCompleted={() => setCurrentTab('home')} />
      </div>
    );
  }

  const navigateTo = (tab: string, jobId?: string) => {
    setCurrentTab(tab);
    if (jobId) {
      setSelectedJobId(jobId);
    }
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 flex flex-col">
      <FirestorePermissionBanner />
      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Brand */}
          <div
            onClick={() => navigateTo('home')}
            className="flex items-center gap-2.5 cursor-pointer select-none"
          >
            <div className="w-8 h-8 rounded-lg bg-neutral-900 text-white flex items-center justify-center font-bold">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight text-neutral-900 block leading-none">
                Job Portal
              </span>
              <span className="text-[10px] text-neutral-500 block mt-0.5">Invite-Only</span>
            </div>
          </div>

          {/* Desktop Navigation Links - NOTE: Admin tab is hidden from top nav as requested */}
          <nav className="hidden md:flex items-center gap-1">
            <button
              id="nav-home"
              onClick={() => navigateTo('home')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                currentTab === 'home'
                  ? 'bg-neutral-100 text-neutral-900 font-semibold'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
              }`}
            >
              <HomeIcon className="w-3.5 h-3.5" />
              <span>Home</span>
            </button>

            <button
              id="nav-jobs"
              onClick={() => navigateTo('jobs')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                currentTab === 'jobs' || currentTab === 'jobDetails' || currentTab === 'apply'
                  ? 'bg-neutral-100 text-neutral-900 font-semibold'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>Jobs</span>
              {!permissions.jobs && <Lock className="w-3 h-3 text-neutral-400 ml-0.5" />}
            </button>

            <button
              id="nav-applications"
              onClick={() => navigateTo('applications')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                currentTab === 'applications'
                  ? 'bg-neutral-100 text-neutral-900 font-semibold'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
              }`}
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              <span>Applications</span>
              {!permissions.applications && <Lock className="w-3 h-3 text-neutral-400 ml-0.5" />}
            </button>

            <button
              id="nav-resume-builder"
              onClick={() => navigateTo('resumeBuilder')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                currentTab === 'resumeBuilder'
                  ? 'bg-neutral-100 text-neutral-900 font-semibold'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Resume Builder</span>
              {!permissions.resumeBuilder && <Lock className="w-3 h-3 text-neutral-400 ml-0.5" />}
            </button>

            <button
              id="nav-profile"
              onClick={() => navigateTo('profile')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                currentTab === 'profile'
                  ? 'bg-neutral-100 text-neutral-900 font-semibold'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Profile</span>
            </button>
          </nav>

          {/* User profile avatar & Sign out */}
          <div className="hidden md:flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs font-semibold text-neutral-900 leading-tight">
                {profile?.name || user.displayName || 'Candidate'}
              </p>
              <p className="text-[10px] text-neutral-500 truncate max-w-[140px]">{user.email}</p>
            </div>

            <button
              id="nav-signout-btn"
              onClick={signOut}
              title="Sign Out"
              className="p-2 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          {/* Mobile hamburger menu toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-neutral-600 hover:text-neutral-900 cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-neutral-200 bg-white px-4 py-3 space-y-2">
            <button
              onClick={() => navigateTo('home')}
              className="w-full text-left py-2 px-3 rounded text-xs font-medium text-neutral-800 hover:bg-neutral-50 flex items-center gap-2"
            >
              <HomeIcon className="w-4 h-4" />
              <span>Home</span>
            </button>
            <button
              onClick={() => navigateTo('jobs')}
              className="w-full text-left py-2 px-3 rounded text-xs font-medium text-neutral-800 hover:bg-neutral-50 flex items-center gap-2"
            >
              <Briefcase className="w-4 h-4" />
              <span className="flex-1">Jobs</span>
              {!permissions.jobs && <Lock className="w-3.5 h-3.5 text-neutral-400" />}
            </button>
            <button
              onClick={() => navigateTo('applications')}
              className="w-full text-left py-2 px-3 rounded text-xs font-medium text-neutral-800 hover:bg-neutral-50 flex items-center gap-2"
            >
              <FileCheck2 className="w-4 h-4" />
              <span className="flex-1">Applications</span>
              {!permissions.applications && <Lock className="w-3.5 h-3.5 text-neutral-400" />}
            </button>
            <button
              onClick={() => navigateTo('resumeBuilder')}
              className="w-full text-left py-2 px-3 rounded text-xs font-medium text-neutral-800 hover:bg-neutral-50 flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span className="flex-1">Resume Builder</span>
              {!permissions.resumeBuilder && <Lock className="w-3.5 h-3.5 text-neutral-400" />}
            </button>
            <button
              onClick={() => navigateTo('profile')}
              className="w-full text-left py-2 px-3 rounded text-xs font-medium text-neutral-800 hover:bg-neutral-50 flex items-center gap-2"
            >
              <User className="w-4 h-4" />
              <span>Profile</span>
            </button>
            <div className="pt-2 border-t border-neutral-100 flex items-center justify-between">
              <span className="text-xs text-neutral-500 truncate">{user.email}</span>
              <button
                onClick={signOut}
                className="text-xs text-red-600 font-medium hover:underline cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Content View Switcher */}
      <main className="flex-1">
        {currentTab === 'home' && (
          <Home
            onNavigate={(tab, jobId) => {
              if (jobId) setSelectedJobId(jobId);
              setCurrentTab(tab);
            }}
          />
        )}

        {currentTab === 'jobs' && (
          !permissions.jobs ? (
            <FeatureAccessGate featureName="Job Search Portal" onNavigateAllowed={navigateTo} />
          ) : (
            <Jobs
              onSelectJob={jobId => navigateTo('jobDetails', jobId)}
              onApplyJob={jobId => navigateTo('apply', jobId)}
            />
          )
        )}

        {currentTab === 'jobDetails' && selectedJobId && (
          !permissions.jobs ? (
            <FeatureAccessGate featureName="Job Search Portal" onNavigateAllowed={navigateTo} />
          ) : (
            <JobDetails
              jobId={selectedJobId}
              onBack={() => navigateTo('jobs')}
              onApply={jobId => navigateTo('apply', jobId)}
            />
          )
        )}

        {currentTab === 'apply' && selectedJobId && (
          !permissions.applications ? (
            <FeatureAccessGate featureName="Applications & Tailor Flow" onNavigateAllowed={navigateTo} />
          ) : (
            <ApplyFlow
              jobId={selectedJobId}
              onBack={() => navigateTo('jobDetails', selectedJobId)}
              onNavigateApplications={() => navigateTo('applications')}
            />
          )
        )}

        {currentTab === 'applications' && (
          !permissions.applications ? (
            <FeatureAccessGate featureName="Applications Tracker" onNavigateAllowed={navigateTo} />
          ) : (
            <Applications
              onContinueApplication={jobId => navigateTo('apply', jobId)}
              onViewJob={jobId => navigateTo('jobDetails', jobId)}
            />
          )
        )}

        {currentTab === 'resumeBuilder' && (
          !permissions.resumeBuilder ? (
            <FeatureAccessGate featureName="Resume Builder" onNavigateAllowed={navigateTo} />
          ) : (
            <ResumeBuilder />
          )
        )}

        {currentTab === 'profile' && (
          <ProfileSetup isEditing={true} onCompleted={() => navigateTo('home')} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-200 py-6 text-center text-xs text-neutral-500 bg-white">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>Job Application Portal — Invite-Only Access</p>
          <button
            onClick={() => navigateToRoute('/admin')}
            className="text-[11px] text-neutral-400 hover:text-neutral-700 transition-colors cursor-pointer"
          >
            Admin Console (/admin)
          </button>
        </div>
      </footer>
    </div>
  );
}

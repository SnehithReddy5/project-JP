import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { jobService } from '../services/jobService';
import { applicationService } from '../services/applicationService';
import { Job, JobSource } from '../types';
import {
  Search,
  MapPin,
  Globe,
  Clock,
  Briefcase,
  Sparkles,
  ExternalLink,
  RefreshCw,
  DollarSign,
  Compass,
  Bookmark,
  BookmarkCheck,
  CheckCircle2,
  X,
  Zap,
  ChevronDown,
} from 'lucide-react';

interface JobsProps {
  onSelectJob: (jobId: string) => void;
  onApplyJob: (jobId: string) => void;
}

// Comprehensive country list with flags
const COUNTRIES = [
  { value: '', label: 'Select a country...', flag: '🌍' },
  { value: 'USA', label: 'United States', flag: '🇺🇸' },
  { value: 'India', label: 'India', flag: '🇮🇳' },
  { value: 'UK', label: 'United Kingdom', flag: '🇬🇧' },
  { value: 'Canada', label: 'Canada', flag: '🇨🇦' },
  { value: 'Australia', label: 'Australia', flag: '🇦🇺' },
  { value: 'Germany', label: 'Germany', flag: '🇩🇪' },
  { value: 'France', label: 'France', flag: '🇫🇷' },
  { value: 'Netherlands', label: 'Netherlands', flag: '🇳🇱' },
  { value: 'Singapore', label: 'Singapore', flag: '🇸🇬' },
  { value: 'UAE', label: 'United Arab Emirates', flag: '🇦🇪' },
  { value: 'Japan', label: 'Japan', flag: '🇯🇵' },
  { value: 'South Korea', label: 'South Korea', flag: '🇰🇷' },
  { value: 'Brazil', label: 'Brazil', flag: '🇧🇷' },
  { value: 'Mexico', label: 'Mexico', flag: '🇲🇽' },
  { value: 'Spain', label: 'Spain', flag: '🇪🇸' },
  { value: 'Italy', label: 'Italy', flag: '🇮🇹' },
  { value: 'Sweden', label: 'Sweden', flag: '🇸🇪' },
  { value: 'Switzerland', label: 'Switzerland', flag: '🇨🇭' },
  { value: 'Ireland', label: 'Ireland', flag: '🇮🇪' },
  { value: 'Poland', label: 'Poland', flag: '🇵🇱' },
  { value: 'Israel', label: 'Israel', flag: '🇮🇱' },
  { value: 'China', label: 'China', flag: '🇨🇳' },
  { value: 'New Zealand', label: 'New Zealand', flag: '🇳🇿' },
  { value: 'South Africa', label: 'South Africa', flag: '🇿🇦' },
  { value: 'Nigeria', label: 'Nigeria', flag: '🇳🇬' },
  { value: 'Philippines', label: 'Philippines', flag: '🇵🇭' },
  { value: 'Indonesia', label: 'Indonesia', flag: '🇮🇩' },
  { value: 'Remote', label: 'Remote / Worldwide', flag: '🌐' },
];

export const Jobs: React.FC<JobsProps> = ({ onSelectJob, onApplyJob }) => {
  const { user, profile } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchingLive, setSearchingLive] = useState(false);
  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set());
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Live updates state
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [secondsSinceSync, setSecondsSinceSync] = useState(0);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);

  // Filters — Country is REQUIRED, City is OPTIONAL
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<string>(profile?.country || '');
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [jobRoleFilter, setJobRoleFilter] = useState<string>('');
  const [sourceFilter, setSourceFilter] = useState<
    'all' | 'Indeed' | 'Remotive' | 'Glassdoor' | 'LinkedIn'
  >('all');
  const [timeFilter, setTimeFilter] = useState<'all' | '12h' | '7d'>('all');

  const autoRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch real-time live internet jobs
  const fetchLiveJobs = async (showFullLoading = true) => {
    if (!selectedCountry) {
      setSaveNotice('Please select a country before searching.');
      setTimeout(() => setSaveNotice(null), 3500);
      return;
    }
    if (showFullLoading) setLoading(true);
    setHasSearched(true);
    try {
      jobService.purgeStaticJobs();
      const freshJobs = await jobService.searchInternetJobs({
        query: searchTerm.trim() || profile?.jobRole || '',
        location: selectedCity.trim() || '',
        country: selectedCountry,
        source: sourceFilter,
      });
      setJobs(freshJobs);
      setLastSyncTime(new Date());
      setSecondsSinceSync(0);
    } catch (err) {
      console.error('Failed to load live jobs:', err);
    } finally {
      if (showFullLoading) setLoading(false);
    }
  };

  const fetchSavedApplications = async () => {
    if (!user) return;
    try {
      const apps = await applicationService.getApplicationsByUser(user.uid);
      const ids = new Set(apps.map(a => a.jobId));
      setSavedJobIds(ids);
    } catch (e) {
      console.warn('Could not load user saved applications:', e);
    }
  };

  // Load saved applications on mount (but NOT jobs — user must search)
  useEffect(() => {
    if (user) {
      fetchSavedApplications();
    }
  }, [user]);

  // Pre-fill country from profile
  useEffect(() => {
    if (profile?.country && !selectedCountry) {
      setSelectedCountry(profile.country);
    }
  }, [profile]);

  // Elapsed seconds timer for live update ticker
  useEffect(() => {
    if (!lastSyncTime) return;
    const timer = setInterval(() => {
      setSecondsSinceSync(Math.floor((Date.now() - lastSyncTime.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [lastSyncTime]);

  // Auto-refresh interval (every 60s) — only when enabled and user has already searched
  useEffect(() => {
    if (autoRefreshEnabled && hasSearched) {
      autoRefreshIntervalRef.current = setInterval(() => {
        fetchLiveJobs(false);
      }, 60000);
    } else if (autoRefreshIntervalRef.current) {
      clearInterval(autoRefreshIntervalRef.current);
    }
    return () => {
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
      }
    };
  }, [autoRefreshEnabled, hasSearched, searchTerm, selectedCity, selectedCountry, sourceFilter]);

  const handleSearchSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedCountry) {
      setSaveNotice('⚠️ Please select a country to search jobs.');
      setTimeout(() => setSaveNotice(null), 3500);
      return;
    }
    setSearchingLive(true);
    try {
      jobService.purgeStaticJobs();
      const fresh = await jobService.searchInternetJobs({
        query: searchTerm.trim() || profile?.jobRole || '',
        location: selectedCity.trim() || '',
        country: selectedCountry,
        source: sourceFilter,
      });
      setJobs(fresh);
      setHasSearched(true);
      setLastSyncTime(new Date());
      setSecondsSinceSync(0);
      if (fresh.length > 0) {
        setSaveNotice(`🔍 Found ${fresh.length} live jobs in ${selectedCountry}${selectedCity ? `, ${selectedCity}` : ''}`);
      } else {
        setSaveNotice(`No jobs found for your search. Try different keywords or broaden your location.`);
      }
      setTimeout(() => setSaveNotice(null), 4000);
    } catch (err) {
      console.error('Live search error:', err);
    } finally {
      setSearchingLive(false);
    }
  };

  const handleToggleSaveJob = async (job: Job) => {
    if (!user) return;
    const isSaved = savedJobIds.has(job.id);
    if (isSaved) {
      const existing = await applicationService.findExistingApplication(user.uid, job.id);
      if (existing) {
        await applicationService.deleteApplication(existing.id);
        setSavedJobIds(prev => {
          const next = new Set(prev);
          next.delete(job.id);
          return next;
        });
        setSaveNotice(`Removed "${job.title}" at ${job.company} from saved applications.`);
        setTimeout(() => setSaveNotice(null), 3500);
      }
    } else {
      await applicationService.bookmarkOrSaveJob(
        user.uid,
        { id: job.id, company: job.company, title: job.title },
        'saved'
      );
      setSavedJobIds(prev => new Set(prev).add(job.id));
      setSaveNotice(`Saved "${job.title}" at ${job.company} to your Applications tracker!`);
      setTimeout(() => setSaveNotice(null), 3500);
    }
  };

  const formatPostedTime = (dateStr: string) => {
    if (!dateStr) return 'Active now';
    if (dateStr.includes('ago') || dateStr.includes('now')) return dateStr;
    const diffHours = Math.floor(
      (new Date().getTime() - new Date(dateStr).getTime()) / (1000 * 60 * 60)
    );
    if (isNaN(diffHours) || diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  const getSourceBadge = (source?: string) => {
    switch (source) {
      case 'The Muse':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
            The Muse
          </span>
        );
      case 'Indeed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
            Indeed
          </span>
        );
      case 'Remotive':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-teal-50 text-teal-700 border border-teal-200">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse"></span>
            Remotive
          </span>
        );
      case 'Jobicy':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
            Jobicy
          </span>
        );
      case 'Glassdoor':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Glassdoor
          </span>
        );
      case 'LinkedIn':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
            LinkedIn
          </span>
        );
      case 'Company Portal':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse"></span>
            Live Feed
          </span>
        );
    }
  };

  // Filter jobs
  const filteredJobs = jobs.filter(job => {
    if (sourceFilter !== 'all') {
      const matchSource = (job.source || '').toLowerCase() === sourceFilter.toLowerCase();
      if (!matchSource) return false;
    }

    if (timeFilter !== 'all' && job.postedAt && !job.postedAt.includes('ago')) {
      const now = new Date().getTime();
      const jobTime = new Date(job.postedAt).getTime();
      if (!isNaN(jobTime)) {
        const diffHours = (now - jobTime) / (1000 * 60 * 60);
        if (timeFilter === '12h' && diffHours > 12) return false;
        if (timeFilter === '7d' && diffHours > 24 * 7) return false;
      }
    }

    if (
      jobRoleFilter.trim() &&
      job.title &&
      !job.title.toLowerCase().includes(jobRoleFilter.toLowerCase().trim())
    ) {
      return false;
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchCompany = (job.company || '').toLowerCase().includes(q);
      const matchTitle = (job.title || '').toLowerCase().includes(q);
      const matchDesc = (job.description || '').toLowerCase().includes(q);
      if (!matchCompany && !matchTitle && !matchDesc) return false;
    }

    return true;
  });

  // Sort: newest first
  const sortedJobs = [...filteredJobs].sort((a, b) => {
    return new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime();
  });

  const selectedCountryInfo = COUNTRIES.find(c => c.value === selectedCountry);

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 space-y-6">
      {/* Toast Notice */}
      {saveNotice && (
        <div className="p-3.5 rounded-xl bg-neutral-900 text-white text-xs flex items-center justify-between gap-2 shadow-md animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{saveNotice}</span>
          </div>
          <button
            onClick={() => setSaveNotice(null)}
            className="text-neutral-400 hover:text-white cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Search Jobs</h1>
            {hasSearched && lastSyncTime && (
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>LIVE</span>
              </div>
            )}
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Select a country, optionally enter a city, and click Search to find live job listings.
            {hasSearched && lastSyncTime && (
              <span className="ml-2 text-emerald-700 font-medium">
                Updated {secondsSinceSync === 0 ? 'just now' : `${secondsSinceSync}s ago`}
              </span>
            )}
          </p>
        </div>

        {/* Live Controls — only show after first search */}
        {hasSearched && (
          <div className="flex items-center gap-2">
            <button
              id="toggle-autorefresh-btn"
              onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 border rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                autoRefreshEnabled
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50'
              }`}
              title="Automatically refresh jobs every 60 seconds"
            >
              <Zap className={`w-3.5 h-3.5 ${autoRefreshEnabled ? 'text-emerald-600 fill-emerald-600' : 'text-neutral-400'}`} />
              <span>Auto {autoRefreshEnabled ? 'ON' : 'OFF'}</span>
            </button>

            <button
              id="refresh-jobs-btn"
              onClick={() => fetchLiveJobs(true)}
              disabled={loading || searchingLive}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-neutral-200 rounded-lg text-xs font-medium text-neutral-700 bg-white hover:bg-neutral-50 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
              title="Refresh job results"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading || searchingLive ? 'animate-spin' : ''}`} />
              <span>{loading || searchingLive ? 'Fetching...' : 'Refresh'}</span>
            </button>
          </div>
        )}
      </div>

      {/* ========== SEARCH FORM ========== */}
      <form
        onSubmit={handleSearchSubmit}
        className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm space-y-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Country Select — REQUIRED */}
          <div className="relative md:col-span-4">
            <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">
              Country <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Globe className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5 pointer-events-none" />
              <select
                id="jobs-country-select"
                value={selectedCountry}
                onChange={e => setSelectedCountry(e.target.value)}
                className={`w-full pl-9 pr-8 py-2 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent cursor-pointer appearance-none ${
                  !selectedCountry ? 'border-red-300 text-neutral-400' : 'border-neutral-200 text-neutral-900'
                }`}
                required
              >
                {COUNTRIES.map(c => (
                  <option key={c.value} value={c.value} disabled={c.value === ''}>
                    {c.flag} {c.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-neutral-400 absolute right-3 top-2.5 pointer-events-none" />
            </div>
          </div>

          {/* City Input — OPTIONAL */}
          <div className="relative md:col-span-3">
            <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">
              City <span className="text-neutral-300">(optional)</span>
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                id="jobs-city-input"
                type="text"
                placeholder="e.g. New York, London, Remote"
                value={selectedCity}
                onChange={e => setSelectedCity(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
              />
            </div>
          </div>

          {/* Job Title / Keywords */}
          <div className="relative md:col-span-3">
            <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">
              Keywords <span className="text-neutral-300">(optional)</span>
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                id="jobs-search-input"
                type="text"
                placeholder="e.g. React, Data Science"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
              />
            </div>
          </div>

          {/* Search Button */}
          <div className="md:col-span-2 flex items-end">
            <button
              id="search-jobs-btn"
              type="submit"
              disabled={loading || searchingLive || !selectedCountry}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-2 bg-neutral-900 text-white rounded-lg text-sm font-semibold hover:bg-neutral-800 transition-all shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading || searchingLive ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Searching...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Search</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Current search info */}
        {selectedCountry && (
          <div className="flex items-center gap-2 text-xs text-neutral-500 pt-1 border-t border-neutral-100">
            <Globe className="w-3.5 h-3.5 text-neutral-400" />
            <span>
              Searching in <strong className="text-neutral-800">{selectedCountryInfo?.flag} {selectedCountryInfo?.label || selectedCountry}</strong>
              {selectedCity && (
                <>, city: <strong className="text-neutral-800">{selectedCity}</strong></>
              )}
              {searchTerm && (
                <>, keywords: <strong className="text-neutral-800">{searchTerm}</strong></>
              )}
            </span>
          </div>
        )}
      </form>

      {/* ========== INITIAL STATE — No search yet ========== */}
      {!hasSearched && (
        <div className="bg-white border border-neutral-200 rounded-xl p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto">
            <Compass className="w-8 h-8 text-neutral-400" />
          </div>
          <h3 className="text-lg font-bold text-neutral-800">
            Start Your Job Search
          </h3>
          <p className="text-sm text-neutral-500 max-w-md mx-auto leading-relaxed">
            Select a <strong>country</strong> above and click <strong>Search</strong> to discover live job listings
            from real job boards (The Muse, Jobicy, Remotive). City and keywords are optional.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-50 border border-neutral-200 rounded-full text-xs text-neutral-600">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              The Muse
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-50 border border-neutral-200 rounded-full text-xs text-neutral-600">
              <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
              Jobicy
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-50 border border-neutral-200 rounded-full text-xs text-neutral-600">
              <span className="w-2 h-2 rounded-full bg-teal-500"></span>
              Remotive
            </div>
          </div>
          {!selectedCountry && (
            <p className="text-[11px] text-amber-600 font-medium">
              ↑ Please select a country to begin
            </p>
          )}
        </div>
      )}

      {/* ========== POST-SEARCH CONTENT ========== */}
      {hasSearched && (
        <>
          {/* Source Tabs Bar */}
          <div className="flex items-center gap-1 p-1 bg-neutral-100 rounded-xl overflow-x-auto">
            {(['all', 'Indeed', 'Remotive', 'Glassdoor', 'LinkedIn'] as const).map(
              src => (
                <button
                  key={src}
                  id={`source-tab-${src.toLowerCase().replace(/\s+/g, '-')}`}
                  onClick={() => setSourceFilter(src)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
                    sourceFilter === src
                      ? 'bg-white text-neutral-900 shadow-xs font-semibold'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  {src === 'all' ? 'All Sources' : src}
                </button>
              )
            )}
          </div>

          {/* Time Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-neutral-200 rounded-xl px-4 py-3 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                Posted:
              </span>
              <button
                id="time-filter-all"
                onClick={() => setTimeFilter('all')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  timeFilter === 'all'
                    ? 'bg-neutral-900 text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                All Live
              </button>
              <button
                id="time-filter-12h"
                onClick={() => setTimeFilter('12h')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  timeFilter === '12h'
                    ? 'bg-neutral-900 text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                Last 12 Hours
              </button>
              <button
                id="time-filter-7d"
                onClick={() => setTimeFilter('7d')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  timeFilter === '7d'
                    ? 'bg-neutral-900 text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                Last 7 Days
              </button>
            </div>

            <div className="text-xs text-neutral-500">
              Found <span className="font-semibold text-neutral-900">{sortedJobs.length}</span> live positions
              {selectedCountry && (
                <span> in <strong>{selectedCountryInfo?.flag} {selectedCountry}</strong></span>
              )}
            </div>
          </div>

          {/* Jobs List */}
          {loading ? (
            <div className="py-24 text-center text-xs text-neutral-500 space-y-3 bg-white border border-neutral-200 rounded-xl">
              <RefreshCw className="w-7 h-7 animate-spin mx-auto text-neutral-400" />
              <p className="font-medium text-neutral-700">Searching live job feeds...</p>
              <p className="text-[11px] text-neutral-400 max-w-sm mx-auto">
                Fetching real-time listings from The Muse, Jobicy, and Remotive for {selectedCountryInfo?.flag} {selectedCountry}
                {selectedCity && ` — ${selectedCity}`}.
              </p>
            </div>
          ) : sortedJobs.length === 0 ? (
            <div className="bg-white border border-neutral-200 rounded-xl p-12 text-center">
              <Briefcase className="w-10 h-10 text-neutral-300 mx-auto mb-2" />
              <h3 className="text-base font-semibold text-neutral-800">No jobs found</h3>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto mt-1">
                Try different keywords, remove the city filter, or select "Remote / Worldwide" as your country.
              </p>
              <div className="flex items-center justify-center gap-2 mt-4">
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedCity('');
                    setSourceFilter('all');
                    setTimeFilter('all');
                  }}
                  className="px-4 py-2 border border-neutral-200 text-neutral-700 text-xs font-medium rounded-lg hover:bg-neutral-50 cursor-pointer"
                >
                  Reset Filters
                </button>
                <button
                  onClick={() => handleSearchSubmit()}
                  className="px-4 py-2 bg-neutral-900 text-white text-xs font-medium rounded-lg hover:bg-neutral-800 cursor-pointer"
                >
                  Search Again
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedJobs.map(job => {
                const isSaved = savedJobIds.has(job.id);

                return (
                  <div
                    key={job.id}
                    className="bg-white border border-neutral-200 rounded-xl p-5 shadow-xs hover:border-neutral-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-2 max-w-2xl">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-neutral-900 text-base">{job.title}</span>
                        {getSourceBadge(job.source)}
                      </div>

                      <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-neutral-600">
                        <span className="font-semibold text-neutral-800">{job.company}</span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-neutral-400" />
                          {job.location} {job.country && job.country !== 'Global' && job.country !== 'Remote' ? `• ${job.country}` : ''}
                        </span>
                        {job.salary && (
                          <span className="flex items-center gap-1 font-medium text-emerald-700">
                            <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                            {job.salary}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-neutral-400" />
                          {formatPostedTime(job.postedAt)}
                        </span>
                      </div>

                      <p className="text-xs text-neutral-500 line-clamp-2 leading-relaxed">
                        {job.description}
                      </p>

                      <div className="pt-1">
                        <a
                          href={job.applicationUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-neutral-500 hover:text-neutral-900 underline underline-offset-2 cursor-pointer"
                        >
                          <span>Open original listing{job.source ? ` on ${job.source}` : ''}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                      <button
                        id={`save-job-btn-${job.id}`}
                        onClick={() => handleToggleSaveJob(job)}
                        className={`inline-flex items-center gap-1 px-3 py-2 border rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                          isSaved
                            ? 'bg-amber-50 text-amber-800 border-amber-300'
                            : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50'
                        }`}
                        title={isSaved ? 'Job is saved in your Applications' : 'Save to Applications tracker'}
                      >
                        {isSaved ? (
                          <>
                            <BookmarkCheck className="w-3.5 h-3.5 text-amber-600" />
                            <span>Saved</span>
                          </>
                        ) : (
                          <>
                            <Bookmark className="w-3.5 h-3.5 text-neutral-500" />
                            <span>Save</span>
                          </>
                        )}
                      </button>

                      <button
                        id={`view-job-${job.id}`}
                        onClick={() => onSelectJob(job.id)}
                        className="px-3.5 py-2 border border-neutral-300 rounded-lg text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition-colors cursor-pointer"
                      >
                        Details
                      </button>

                      <button
                        id={`apply-job-${job.id}`}
                        onClick={() => onApplyJob(job.id)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-neutral-900 text-white rounded-lg text-xs font-medium hover:bg-neutral-800 transition-colors shadow-xs cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Apply & Tailor</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};

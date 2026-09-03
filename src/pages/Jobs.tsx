import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { jobService } from '../services/jobService';
import { Job, JobSource } from '../types';
import {
  Search,
  MapPin,
  Globe,
  Clock,
  Briefcase,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Filter,
  RefreshCw,
  DollarSign,
  Compass,
} from 'lucide-react';

interface JobsProps {
  onSelectJob: (jobId: string) => void;
  onApplyJob: (jobId: string) => void;
}

export const Jobs: React.FC<JobsProps> = ({ onSelectJob, onApplyJob }) => {
  const { profile } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchingLive, setSearchingLive] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<string>('all');
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [jobRoleFilter, setJobRoleFilter] = useState<string>('');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'LinkedIn' | 'Indeed' | 'Glassdoor' | 'Company Portal'>('all');
  const [timeFilter, setTimeFilter] = useState<'all' | '12h' | '7d'>('all');

  const fetchJobs = async () => {
    setLoading(true);
    try {
      await jobService.seedInitialJobsIfEmpty();
      const data = await jobService.getAllJobs();
      setJobs(data);
    } catch (err) {
      console.error('Failed to load jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleLiveInternetSearch = async () => {
    setSearchingLive(true);
    try {
      const fresh = await jobService.searchInternetJobs({
        query: searchTerm.trim() || profile?.jobRole || 'Software Engineer',
        location: selectedLocation.trim() || profile?.location || '',
        country: selectedCountry !== 'all' ? selectedCountry : profile?.country || '',
        source: sourceFilter,
      });
      setJobs(fresh);
    } catch (err) {
      console.error('Live search error:', err);
    } finally {
      setSearchingLive(false);
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
      case 'LinkedIn':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
            LinkedIn
          </span>
        );
      case 'Indeed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
            Indeed
          </span>
        );
      case 'Glassdoor':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Glassdoor
          </span>
        );
      case 'Company Portal':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
            Company Portal
          </span>
        );
    }
  };

  // Filter and prioritize jobs
  const filteredJobs = jobs.filter(job => {
    // Source filter
    if (sourceFilter !== 'all') {
      const matchSource = (job.source || '').toLowerCase() === sourceFilter.toLowerCase();
      if (!matchSource) return false;
    }

    // Time filter
    if (timeFilter !== 'all' && job.postedAt && !job.postedAt.includes('ago')) {
      const now = new Date().getTime();
      const jobTime = new Date(job.postedAt).getTime();
      if (!isNaN(jobTime)) {
        const diffHours = (now - jobTime) / (1000 * 60 * 60);
        if (timeFilter === '12h' && diffHours > 12) return false;
        if (timeFilter === '7d' && diffHours > 24 * 7) return false;
      }
    }

    // Country filter
    if (selectedCountry !== 'all' && job.country && job.country.toLowerCase() !== selectedCountry.toLowerCase()) {
      return false;
    }

    // Location text filter
    if (
      selectedLocation.trim() &&
      job.location &&
      !job.location.toLowerCase().includes(selectedLocation.toLowerCase().trim())
    ) {
      return false;
    }

    // Job role filter
    if (
      jobRoleFilter.trim() &&
      job.title &&
      !job.title.toLowerCase().includes(jobRoleFilter.toLowerCase().trim())
    ) {
      return false;
    }

    // Generic search (title, company, description)
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchCompany = (job.company || '').toLowerCase().includes(q);
      const matchTitle = (job.title || '').toLowerCase().includes(q);
      const matchDesc = (job.description || '').toLowerCase().includes(q);
      if (!matchCompany && !matchTitle && !matchDesc) return false;
    }

    return true;
  });

  // Prioritize user's location matching jobs to the top
  const sortedJobs = [...filteredJobs].sort((a, b) => {
    const userCity = (profile?.location || '').toLowerCase();
    const aCityMatch = userCity && a.location.toLowerCase().includes(userCity);
    const bCityMatch = userCity && b.location.toLowerCase().includes(userCity);

    if (aCityMatch && !bCityMatch) return -1;
    if (!aCityMatch && bCityMatch) return 1;

    // Secondary sort: posted date descending
    return new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime();
  });

  const availableCountries = Array.from(new Set(jobs.map(j => j.country).filter(Boolean)));

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 space-y-6">
      {/* Header section with live internet source note */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Explore Active Jobs</h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              LIVE INTERNET FEEDS
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Real-time active postings aggregated from LinkedIn, Indeed, Glassdoor, and official company portals.
          </p>
        </div>

        {/* Quick action buttons */}
        <div className="flex items-center gap-2">
          <button
            id="refresh-jobs-btn"
            onClick={fetchJobs}
            disabled={loading || searchingLive}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-neutral-200 rounded-lg text-xs font-medium text-neutral-700 bg-white hover:bg-neutral-50 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
            title="Refresh active job postings"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Jobs</span>
          </button>

          <button
            id="live-search-internet-btn"
            onClick={handleLiveInternetSearch}
            disabled={loading || searchingLive}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-neutral-900 text-white rounded-lg text-xs font-medium hover:bg-neutral-800 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
            title="Perform a live web search for recent postings"
          >
            <Compass className={`w-3.5 h-3.5 ${searchingLive ? 'animate-spin' : ''}`} />
            <span>{searchingLive ? 'Searching Web...' : 'Live Web Search'}</span>
          </button>
        </div>
      </div>

      {/* Candidate matching banner */}
      {profile?.location && (
        <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 text-xs text-neutral-700 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Prioritizing active positions in{' '}
              <strong className="text-neutral-900 font-semibold">{profile.location}, {profile.country}</strong>{' '}
              tailored to your target role{' '}
              <strong className="text-neutral-900 font-semibold">{profile.jobRole || 'Software Engineer'}</strong>.
            </span>
          </div>
          <button
            onClick={() => {
              setSelectedLocation(profile.location);
              setSelectedCountry(profile.country);
            }}
            className="text-xs font-semibold text-neutral-900 hover:underline shrink-0 cursor-pointer"
          >
            Filter to My City
          </button>
        </div>
      )}

      {/* Source Tabs Bar */}
      <div className="flex items-center gap-1 p-1 bg-neutral-100 rounded-xl overflow-x-auto">
        {(['all', 'LinkedIn', 'Indeed', 'Glassdoor', 'Company Portal'] as const).map(src => (
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
            {src === 'all' ? 'All Job Sources' : src}
          </button>
        ))}
      </div>

      {/* Search & Location Filters */}
      <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Main search keyword */}
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
            <input
              id="jobs-search-input"
              type="text"
              placeholder="Search by job title, company, or tech stack..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
            />
          </div>

          {/* Country select */}
          <div className="relative">
            <Globe className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
            <select
              id="jobs-country-select"
              value={selectedCountry}
              onChange={e => setSelectedCountry(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-neutral-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent cursor-pointer"
            >
              <option value="all">All Countries</option>
              {availableCountries.map(c => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Location city input */}
          <div className="relative">
            <MapPin className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
            <input
              id="jobs-location-input"
              type="text"
              placeholder="City (e.g. Hyderabad)"
              value={selectedLocation}
              onChange={e => setSelectedLocation(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
            />
          </div>
        </div>

        {/* Time filters bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-neutral-100">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
              Posting Time:
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
              All Time
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
            Found <span className="font-semibold text-neutral-900">{sortedJobs.length}</span> active job opportunities
          </div>
        </div>
      </div>

      {/* Jobs List */}
      {loading ? (
        <div className="py-20 text-center text-xs text-neutral-500 space-y-2">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-neutral-400" />
          <p>Loading active internet listings...</p>
        </div>
      ) : sortedJobs.length === 0 ? (
        <div className="bg-white border border-neutral-200 rounded-xl p-12 text-center">
          <Briefcase className="w-10 h-10 text-neutral-300 mx-auto mb-2" />
          <h3 className="text-base font-semibold text-neutral-800">No jobs match your current filters</h3>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto mt-1">
            Try adjusting your search keywords, clearing location filters, or running a Live Web Search.
          </p>
          <div className="flex items-center justify-center gap-2 mt-4">
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedCountry('all');
                setSelectedLocation('');
                setSourceFilter('all');
                setTimeFilter('all');
              }}
              className="px-4 py-2 border border-neutral-200 text-neutral-700 text-xs font-medium rounded-lg hover:bg-neutral-50 cursor-pointer"
            >
              Reset Filters
            </button>
            <button
              onClick={handleLiveInternetSearch}
              className="px-4 py-2 bg-neutral-900 text-white text-xs font-medium rounded-lg hover:bg-neutral-800 cursor-pointer"
            >
              Live Search Internet
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedJobs.map(job => {
            const isUserCity =
              profile?.location &&
              job.location.toLowerCase().includes(profile.location.toLowerCase());

            return (
              <div
                key={job.id}
                className="bg-white border border-neutral-200 rounded-xl p-5 shadow-xs hover:border-neutral-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-2 max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-neutral-900 text-base">{job.title}</span>
                    {getSourceBadge(job.source)}
                    {isUserCity && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <MapPin className="w-3 h-3 mr-0.5" />
                        Exact City Match
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-neutral-600">
                    <span className="font-semibold text-neutral-800">{job.company}</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-neutral-400" />
                      {job.location}, {job.country}
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
                      className="inline-flex items-center gap-1 text-[11px] text-neutral-500 hover:text-neutral-900 underline underline-offset-2"
                    >
                      <span>View original posting on {job.source || 'career site'}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  <button
                    id={`view-job-${job.id}`}
                    onClick={() => onSelectJob(job.id)}
                    className="px-3.5 py-2 border border-neutral-300 rounded-lg text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition-colors cursor-pointer"
                  >
                    View Details
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
    </div>
  );
};

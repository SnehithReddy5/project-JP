import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { applicationService } from '../services/applicationService';
import { jobService } from '../services/jobService';
import { JobApplication, Job } from '../types';
import {
  Briefcase,
  FileCheck2,
  FileText,
  Clock,
  Building2,
  MapPin,
  ArrowRight,
  ExternalLink,
  Sparkles,
} from 'lucide-react';

interface HomeProps {
  onNavigate: (tab: string, jobId?: string) => void;
}

export const Home: React.FC<HomeProps> = ({ onNavigate }) => {
  const { user, profile } = useAuth();
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        setLoading(true);
        // Purge any legacy static mock jobs
        jobService.purgeStaticJobs();

        const [userApps, allJobs] = await Promise.all([
          applicationService.getApplicationsByUser(user.uid),
          jobService.getAllJobs(),
        ]);
        setApplications(userApps);

        // Filter or rank jobs matching user location
        const userLoc = (profile?.location || '').toLowerCase();
        const userCountry = (profile?.country || '').toLowerCase();

        const matched = allJobs
          .filter(j => {
            const loc = j.location.toLowerCase();
            const country = j.country.toLowerCase();
            return loc.includes(userLoc) || country.includes(userCountry);
          })
          .slice(0, 3);

        setRecentJobs(matched.length > 0 ? matched : allJobs.slice(0, 3));
      } catch (err) {
        console.error('Error loading dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, profile]);

  const appliedCount = applications.filter(a => a.status === 'applied').length;
  const draftsCount = applications.filter(a => a.status === 'draft').length;
  const recentApps = applications.slice(0, 5);

  const formatPostedTime = (dateStr: string) => {
    const diffHours = Math.floor(
      (new Date().getTime() - new Date(dateStr).getTime()) / (1000 * 60 * 60)
    );
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 space-y-8">
      {/* Welcome header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
            Welcome back 👋
          </h1>
          <p className="text-sm text-neutral-600 mt-1">
            Tracking jobs for <span className="font-semibold text-neutral-800">{profile?.jobRole || 'Engineer'}</span> in{' '}
            <span className="font-semibold text-neutral-800">{profile?.location || 'Your city'}, {profile?.country || 'Country'}</span>
          </p>
        </div>

        <button
          id="home-explore-jobs-btn"
          onClick={() => onNavigate('jobs')}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-neutral-900 text-white text-sm font-medium rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <span>Explore Location Jobs</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div
          onClick={() => onNavigate('applications')}
          className="bg-white border border-neutral-200 rounded-xl p-6 shadow-xs hover:border-neutral-300 transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-neutral-600">Applied Jobs</span>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <FileCheck2 className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold text-neutral-900 mt-3">{appliedCount}</p>
          <div className="mt-2 flex items-center text-xs text-neutral-500 gap-1 group-hover:text-neutral-900 transition-colors">
            <span>View tracked applications</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>

        <div
          onClick={() => onNavigate('applications')}
          className="bg-white border border-neutral-200 rounded-xl p-6 shadow-xs hover:border-neutral-300 transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-neutral-600">Drafts</span>
            <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold text-neutral-900 mt-3">{draftsCount}</p>
          <div className="mt-2 flex items-center text-xs text-neutral-500 gap-1 group-hover:text-neutral-900 transition-colors">
            <span>Resume tailoring in progress</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>

      {/* Recent Applications table */}
      <div className="bg-white border border-neutral-200 rounded-xl shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-neutral-900">Recent Applications</h2>
          {applications.length > 0 && (
            <button
              onClick={() => onNavigate('applications')}
              className="text-xs font-medium text-neutral-600 hover:text-neutral-900 cursor-pointer"
            >
              View all
            </button>
          )}
        </div>

        {recentApps.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Briefcase className="w-10 h-10 text-neutral-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-neutral-800">No applications yet</p>
            <p className="text-xs text-neutral-500 max-w-sm mx-auto mt-1">
              Start applying to jobs matching your location in {profile?.location || 'your area'}.
              We will automatically tailor your resume.
            </p>
            <button
              onClick={() => onNavigate('jobs')}
              className="mt-4 px-4 py-2 bg-neutral-900 text-white text-xs font-medium rounded-lg hover:bg-neutral-800 cursor-pointer"
            >
              Browse Jobs
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50 text-neutral-500 text-xs uppercase tracking-wider border-b border-neutral-100">
                <tr>
                  <th className="px-6 py-3 font-semibold">Company</th>
                  <th className="px-6 py-3 font-semibold">Role</th>
                  <th className="px-6 py-3 font-semibold">Status</th>
                  <th className="px-6 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {recentApps.map(app => (
                  <tr key={app.id} className="hover:bg-neutral-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-neutral-900 flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded bg-neutral-100 flex items-center justify-center text-neutral-700 text-xs font-bold shrink-0">
                        {app.company.charAt(0)}
                      </div>
                      <span>{app.company}</span>
                    </td>
                    <td className="px-6 py-4 text-neutral-700">{app.jobTitle}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          app.status === 'applied'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {app.status === 'applied' ? 'Applied' : 'Draft'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => onNavigate('applications')}
                        className="text-xs font-medium text-neutral-800 hover:text-neutral-950 underline underline-offset-2 cursor-pointer"
                      >
                        {app.status === 'applied' ? 'View Resume' : 'Continue Application'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Featured Location Matches */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">
              Jobs in {profile?.location || 'your preferred city'}
            </h2>
            <p className="text-xs text-neutral-500">
              Matches based on {profile?.location}, {profile?.country}
            </p>
          </div>
          <button
            onClick={() => onNavigate('jobs')}
            className="text-xs font-medium text-neutral-800 hover:text-neutral-950 flex items-center gap-1 cursor-pointer"
          >
            <span>View all matching jobs</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {recentJobs.map(job => (
            <div
              key={job.id}
              className="bg-white border border-neutral-200 rounded-xl p-5 shadow-xs flex flex-col justify-between hover:border-neutral-300 transition-colors"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                      {job.company}
                    </span>
                    {job.source && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-700">
                        {job.source}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-neutral-400 flex items-center gap-1 shrink-0">
                    <Clock className="w-3 h-3" />
                    {formatPostedTime(job.postedAt)}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-neutral-900 line-clamp-1">{job.title}</h3>
                <p className="text-xs text-neutral-600 flex items-center gap-1.5 mt-2">
                  <MapPin className="w-3.5 h-3.5 text-neutral-400" />
                  <span>
                    {job.location}, {job.country}
                  </span>
                </p>
              </div>

              <div className="pt-5 mt-4 border-t border-neutral-100 flex items-center justify-between">
                <button
                  onClick={() => onNavigate('jobDetails', job.id)}
                  className="text-xs font-medium text-neutral-700 hover:text-neutral-950 cursor-pointer"
                >
                  View Details
                </button>
                <button
                  onClick={() => onNavigate('apply', job.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 text-white text-xs font-medium rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Apply with AI</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

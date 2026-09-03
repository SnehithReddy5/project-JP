import React, { useEffect, useState } from 'react';
import { jobService } from '../services/jobService';
import { Job } from '../types';
import {
  Building2,
  MapPin,
  Clock,
  Briefcase,
  ExternalLink,
  Sparkles,
  ArrowLeft,
  GraduationCap,
} from 'lucide-react';

interface JobDetailsProps {
  jobId: string;
  onBack: () => void;
  onApply: (jobId: string) => void;
}

export const JobDetails: React.FC<JobDetailsProps> = ({ jobId, onBack, onApply }) => {
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchJob = async () => {
      setLoading(true);
      try {
        const data = await jobService.getJobById(jobId);
        setJob(data);
      } catch (err) {
        console.error('Failed to load job details:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchJob();
  }, [jobId]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center text-sm text-neutral-500">
        Loading job specifications...
      </div>
    );
  }

  if (!job) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center space-y-4">
        <p className="text-neutral-600 text-sm">Job posting not found or has been removed.</p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-neutral-900 text-white rounded-lg text-xs font-medium cursor-pointer"
        >
          Back to Jobs
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 space-y-6">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-600 hover:text-neutral-900 transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Jobs</span>
      </button>

      <div className="bg-white border border-neutral-200 rounded-xl p-6 sm:p-8 shadow-xs space-y-6">
        {/* Header summary */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-neutral-100 pb-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-neutral-100 text-neutral-800 text-xs font-semibold">
                <Building2 className="w-3.5 h-3.5" />
                <span>{job.company}</span>
              </div>
              {job.source && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-neutral-900 text-white">
                  Source: {job.source}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">{job.title}</h1>
            <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-600">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-neutral-400" />
                {job.location}, {job.country}
              </span>
              {job.salary && (
                <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {job.salary}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Briefcase className="w-3.5 h-3.5 text-neutral-400" />
                {job.employmentType || 'Full-time'}
              </span>
              <span className="flex items-center gap-1">
                <GraduationCap className="w-3.5 h-3.5 text-neutral-400" />
                {job.experienceLevel || 'Mid-Senior Level'}
              </span>
            </div>
          </div>

          <button
            id="jobdetails-apply-btn"
            onClick={() => onApply(job.id)}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white text-sm font-medium rounded-lg transition-colors shadow-xs cursor-pointer shrink-0"
          >
            <Sparkles className="w-4 h-4" />
            <span>Apply with AI Resume</span>
          </button>
        </div>

        {/* Job Description */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-900">
            Job Description & Requirements
          </h2>
          <div className="text-sm text-neutral-700 leading-relaxed whitespace-pre-line bg-neutral-50/60 p-5 rounded-lg border border-neutral-100">
            {job.description}
          </div>
        </div>

        {/* External URL info banner */}
        <div className="p-4 rounded-lg bg-neutral-50 border border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-neutral-600">
          <div>
            <p className="font-semibold text-neutral-800">
              Active Listing on {job.source || 'Internet Job Portal'}
            </p>
            <a
              href={job.applicationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-500 hover:text-neutral-900 mt-0.5 truncate max-w-md inline-flex items-center gap-1 underline underline-offset-2"
            >
              <span>{job.applicationUrl}</span>
              <ExternalLink className="w-3 h-3 shrink-0" />
            </a>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <a
              href={job.applicationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3 py-2 border border-neutral-300 rounded-lg text-xs font-medium text-neutral-700 hover:bg-neutral-100 transition-colors"
            >
              <span>Visit Portal</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <button
              onClick={() => onApply(job.id)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-neutral-900 text-white rounded-lg text-xs font-medium hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Tailor & Apply</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

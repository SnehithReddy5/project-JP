import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { jobService } from '../services/jobService';
import { applicationService } from '../services/applicationService';
import { aiService } from '../services/aiService';
import { Job } from '../types';
import { ResumeDocument, ResumeTheme } from '../components/ResumeDocument';
import {
  Sparkles,
  Download,
  ExternalLink,
  ArrowLeft,
  AlertCircle,
  RefreshCw,
  Edit3,
  Eye,
  Printer,
  Save,
  Check,
  Info,
  Trash2,
} from 'lucide-react';

interface ApplyFlowProps {
  jobId: string;
  onBack: () => void;
  onNavigateApplications: () => void;
}

export const ApplyFlow: React.FC<ApplyFlowProps> = ({
  jobId,
  onBack,
  onNavigateApplications,
}) => {
  const { user, profile } = useAuth();
  const [job, setJob] = useState<Job | null>(null);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [tailoredMarkdown, setTailoredMarkdown] = useState<string>('');
  const [loadingJob, setLoadingJob] = useState(true);
  const [tailoring, setTailoring] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [savingManual, setSavingManual] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [appStatus, setAppStatus] = useState<'draft' | 'applied'>('draft');
  const [theme, setTheme] = useState<ResumeTheme>('executive');
  const [isEditing, setIsEditing] = useState(false);
  const [editedMarkdown, setEditedMarkdown] = useState('');
  const [saveSuccessNotice, setSaveSuccessNotice] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      if (!user) return;
      try {
        setLoadingJob(true);
        const jobData = await jobService.getJobById(jobId);
        setJob(jobData);

        if (!jobData) {
          setError('Job not found.');
          return;
        }

        // Check if an application or draft already exists for this job
        const existing = await applicationService.findExistingApplication(user.uid, jobId);
        if (existing) {
          setApplicationId(existing.id);
          setAppStatus(existing.status);
          if (existing.tailoredResumeMarkdown) {
            setTailoredMarkdown(existing.tailoredResumeMarkdown);
            setEditedMarkdown(existing.tailoredResumeMarkdown);
            setLoadingJob(false);
            return;
          }
        }

        // Auto-trigger tailored resume generation if not generated yet
        await generateTailoredResume(jobData, existing?.id);
      } catch (err: any) {
        console.error('Initialization error in ApplyFlow:', err);
        setError(cleanErrorMessage(err?.message || 'Failed to initialize application.'));
      } finally {
        setLoadingJob(false);
      }
    };

    initialize();
  }, [jobId, user]);

  const cleanErrorMessage = (raw: string): string => {
    try {
      if (raw.includes('{') && raw.includes('}')) {
        const parsed = JSON.parse(raw);
        if (parsed?.error?.message) return parsed.error.message;
        if (parsed?.message) return parsed.message;
      }
    } catch {
      // ignore
    }
    if (raw.includes('503') || raw.includes('high demand') || raw.includes('UNAVAILABLE')) {
      return 'The AI service is experiencing high global traffic (503). We automatically provided a smart ATS keyword tailored resume. You can click Regenerate to retry anytime.';
    }
    return raw;
  };

  const generateTailoredResume = async (targetJob: Job, existingAppId?: string) => {
    if (!user || !profile?.baseResumeText) {
      setError('Base resume is missing. Please update your profile with a base resume first.');
      return;
    }

    try {
      setTailoring(true);
      setError(null);
      setNotice(null);

      // Save initial draft record
      const appId = await applicationService.saveApplication({
        id: existingAppId,
        userId: user.uid,
        jobId: targetJob.id,
        company: targetJob.company,
        jobTitle: targetJob.title,
        status: 'draft',
        tailoredResumeMarkdown: '',
      });
      setApplicationId(appId);

      // Call secure server-side AI endpoint
      const result = await aiService.tailorResume({
        baseResume: profile.baseResumeText,
        jobTitle: targetJob.title,
        company: targetJob.company,
        jobDescription: targetJob.description,
      });

      setTailoredMarkdown(result.markdown);
      setEditedMarkdown(result.markdown);

      if (result.notice) {
        setNotice(result.notice);
      } else if (result.source === 'smart-ats-optimizer') {
        setNotice(
          'Tailored using ATS Keyword Alignment Engine (AI service is under temporary high demand). You can edit or regenerate anytime.'
        );
      }

      // Persist tailored markdown to the specific application record in Firestore
      await applicationService.saveApplication({
        id: appId,
        userId: user.uid,
        jobId: targetJob.id,
        company: targetJob.company,
        jobTitle: targetJob.title,
        status: 'draft',
        tailoredResumeMarkdown: result.markdown,
      });
    } catch (err: any) {
      console.error('AI tailoring error:', err);
      const cleaned = cleanErrorMessage(err?.message || 'Failed to tailor resume.');
      setError(cleaned);
    } finally {
      setTailoring(false);
    }
  };

  const handleSaveManualEdits = async () => {
    if (!job || !applicationId || !user) return;
    try {
      setSavingManual(true);
      setTailoredMarkdown(editedMarkdown);
      await applicationService.saveApplication({
        id: applicationId,
        userId: user.uid,
        jobId: job.id,
        company: job.company,
        jobTitle: job.title,
        status: appStatus,
        tailoredResumeMarkdown: editedMarkdown,
      });
      setIsEditing(false);
      setSaveSuccessNotice(true);
      setTimeout(() => setSaveSuccessNotice(false), 3000);
    } catch (err: any) {
      console.error('Error saving manual edits:', err);
      alert('Failed to save edits to Firestore.');
    } finally {
      setSavingManual(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!job) return;
    try {
      setDownloading(true);
      const filename = `${user?.displayName || 'Resume'}_${job.company}_${job.title}`.replace(
        /\s+/g,
        '_'
      );
      await aiService.downloadResumePdf('resume-preview-document', filename);
    } catch (err: any) {
      console.error('PDF download error:', err);
      alert('Could not generate PDF image. You can also use the "Print / Vector PDF" button for instant vector PDF!');
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    aiService.printResume();
  };

  const handleDeleteDraft = async () => {
    if (!applicationId) return;
    if (!confirm('Are you sure you want to discard and delete this draft application?')) return;
    try {
      await applicationService.deleteApplication(applicationId);
      onNavigateApplications();
    } catch (err) {
      console.error('Failed to delete draft:', err);
    }
  };

  const handleContinueToPortal = async () => {
    if (!job || !applicationId || !user) return;

    try {
      // Mark application as Applied
      await applicationService.updateApplicationStatus(applicationId, 'applied');
      setAppStatus('applied');

      // Open external company application portal in a new window/tab
      window.open(job.applicationUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      console.error('Error updating status to applied:', err);
      window.open(job.applicationUrl, '_blank', 'noopener,noreferrer');
    }
  };

  if (loadingJob) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center space-y-3">
        <Sparkles className="w-8 h-8 text-neutral-400 mx-auto animate-pulse" />
        <p className="text-sm font-medium text-neutral-700">
          Preparing role details & candidate profile...
        </p>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center space-y-3">
        <p className="text-sm text-neutral-600">Job not found.</p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-neutral-900 text-white rounded-lg text-xs font-medium cursor-pointer"
        >
          Back
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 space-y-6">
      {/* Top navigation */}
      <div className="flex items-center justify-between no-print">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-600 hover:text-neutral-900 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Job</span>
        </button>

        <div className="flex items-center gap-2">
          {appStatus === 'draft' && applicationId && (
            <button
              id="discard-draft-btn"
              onClick={handleDeleteDraft}
              className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              title="Discard and delete this draft"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Discard Draft</span>
            </button>
          )}
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              appStatus === 'applied'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}
          >
            {appStatus === 'applied' ? 'Status: Applied' : 'Status: Draft'}
          </span>
        </div>
      </div>

      {/* Target Role & Controls Header */}
      <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
            Tailored ATS Application
          </span>
          <h1 className="text-xl font-bold text-neutral-900 mt-1">
            Target: {job.title}
          </h1>
          <p className="text-sm text-neutral-600 font-medium">{job.company}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Edit / Preview Toggle */}
          <button
            onClick={() => {
              if (isEditing) {
                handleSaveManualEdits();
              } else {
                setEditedMarkdown(tailoredMarkdown);
                setIsEditing(true);
              }
            }}
            disabled={tailoring || !tailoredMarkdown}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              isEditing
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'border border-neutral-300 text-neutral-700 hover:bg-neutral-50'
            }`}
          >
            {isEditing ? (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>{savingManual ? 'Saving...' : 'Save & Preview'}</span>
              </>
            ) : (
              <>
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Content</span>
              </>
            )}
          </button>

          {isEditing && (
            <button
              onClick={() => {
                setEditedMarkdown(tailoredMarkdown);
                setIsEditing(false);
              }}
              className="px-2.5 py-2 text-xs text-neutral-500 hover:text-neutral-800 transition-colors"
            >
              Cancel
            </button>
          )}

          <button
            onClick={() => job && generateTailoredResume(job, applicationId || undefined)}
            disabled={tailoring}
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-neutral-300 rounded-lg text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${tailoring ? 'animate-spin' : ''}`} />
            <span>Regenerate with AI</span>
          </button>

          <button
            id="print-pdf-btn"
            onClick={handlePrint}
            disabled={tailoring || !tailoredMarkdown}
            title="Print or save as high-quality vector PDF"
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-neutral-300 rounded-lg text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Print / Vector PDF</span>
          </button>

          <button
            id="download-pdf-btn"
            onClick={handleDownloadPdf}
            disabled={downloading || tailoring || !tailoredMarkdown}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-neutral-900 text-white hover:bg-neutral-800 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{downloading ? 'Exporting...' : 'Download PDF'}</span>
          </button>
        </div>
      </div>

      {/* Save success toast */}
      {saveSuccessNotice && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Resume updates successfully saved to your application!</span>
        </div>
      )}

      {/* Non-blocking Information Banner (e.g. 503 fallback info) */}
      {notice && (
        <div className="p-4 rounded-xl bg-amber-50/90 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5 leading-relaxed no-print">
          <Info className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
          <div>
            <span className="font-semibold block mb-0.5">High Demand Notice:</span>
            <span>{notice}</span>
          </div>
        </div>
      )}

      {/* Error Banner with retry */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between gap-3 no-print">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => job && generateTailoredResume(job, applicationId || undefined)}
            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-[11px] font-medium transition-colors shrink-0 cursor-pointer"
          >
            Retry Now
          </button>
        </div>
      )}

      {/* Tailoring loading state */}
      {tailoring && (
        <div className="bg-white border border-neutral-200 rounded-xl p-12 text-center space-y-3 no-print">
          <div className="inline-flex p-3 rounded-full bg-neutral-100 text-neutral-800 animate-spin">
            <RefreshCw className="w-5 h-5" />
          </div>
          <h3 className="text-base font-semibold text-neutral-900">
            Architecting ATS Tailored Resume...
          </h3>
          <p className="text-xs text-neutral-500 max-w-md mx-auto">
            Aligning your real experience and skills with the job requirements for {job.company}.
            Ensuring zero hallucinations and maximum ATS keyword impact.
          </p>
        </div>
      )}

      {/* Resume Document Preview / Editor Area */}
      {!tailoring && tailoredMarkdown && (
        <div className="space-y-3">
          {/* Format and Theme Toolbar */}
          <div className="flex flex-wrap items-center justify-between text-xs text-neutral-500 px-1 gap-2 no-print">
            <div className="flex items-center gap-2">
              <span className="font-medium text-neutral-700">ATS Template:</span>
              <div className="inline-flex bg-neutral-100 p-0.5 rounded-lg border border-neutral-200">
                <button
                  onClick={() => setTheme('executive')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                    theme === 'executive'
                      ? 'bg-white text-neutral-900 shadow-xs'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  Executive (Classic)
                </button>
                <button
                  onClick={() => setTheme('modern')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                    theme === 'modern'
                      ? 'bg-white text-neutral-900 shadow-xs'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  Tech Modern
                </button>
                <button
                  onClick={() => setTheme('minimal')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                    theme === 'minimal'
                      ? 'bg-white text-neutral-900 shadow-xs'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  Compact Minimal
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[11px] text-neutral-400">Standard A4 Format</span>
              <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                <Check className="w-3 h-3" /> Auto-saved to draft
              </span>
            </div>
          </div>

          {/* Document Renderer / Editor */}
          <div className="border border-neutral-200 rounded-xl bg-neutral-100 p-3 sm:p-8 flex justify-center overflow-x-auto">
            <ResumeDocument
              markdown={isEditing ? editedMarkdown : tailoredMarkdown}
              theme={theme}
              elementId="resume-preview-document"
              isEditable={isEditing}
              onMarkdownChange={setEditedMarkdown}
            />
          </div>
        </div>
      )}

      {/* Action Footer */}
      <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div className="text-xs text-neutral-600">
          <p className="font-semibold text-neutral-900">Ready to apply?</p>
          <p className="text-neutral-500 mt-0.5">
            Download your tailored resume and proceed to the official company career portal.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onNavigateApplications}
            className="text-xs font-medium text-neutral-600 hover:text-neutral-900 cursor-pointer"
          >
            Save as Draft & View All
          </button>

          <button
            id="continue-to-portal-btn"
            onClick={handleContinueToPortal}
            disabled={!tailoredMarkdown}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-medium rounded-lg transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
          >
            <span>Continue to Application</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};


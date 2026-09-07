import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { applicationService } from '../services/applicationService';
import { aiService } from '../services/aiService';
import { ApplicationStatus, JobApplication } from '../types';
import { ResumeDocument, ResumeTheme } from '../components/ResumeDocument';
import {
  FileText,
  ExternalLink,
  Download,
  Eye,
  CheckCircle2,
  Clock,
  Briefcase,
  AlertCircle,
  X,
  Printer,
  Trash2,
  Tag,
  Award,
  Calendar,
  Bookmark,
  ChevronDown,
} from 'lucide-react';

interface ApplicationsProps {
  onContinueApplication: (jobId: string) => void;
  onViewJob: (jobId: string) => void;
}

export const Applications: React.FC<ApplicationsProps> = ({
  onContinueApplication,
  onViewJob,
}) => {
  const { user } = useAuth();
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    'all' | 'applied' | 'interviewing' | 'offer' | 'rejected' | 'saved'
  >('all');
  const [selectedResumeApp, setSelectedResumeApp] = useState<JobApplication | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [modalTheme, setModalTheme] = useState<ResumeTheme>('executive');
  const [appToDelete, setAppToDelete] = useState<JobApplication | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  useEffect(() => {
    const fetchApps = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const data = await applicationService.getApplicationsByUser(user.uid);
        setApplications(data);
      } catch (err) {
        console.error('Failed to load applications:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchApps();
  }, [user]);

  const handleMarkStatus = async (app: JobApplication, nextStatus: ApplicationStatus) => {
    try {
      await applicationService.updateApplicationStatus(app.id, nextStatus);
      setApplications(prev =>
        prev.map(a =>
          a.id === app.id
            ? {
                ...a,
                status: nextStatus,
                appliedAt:
                  nextStatus === 'applied' || nextStatus === 'interviewing' || nextStatus === 'offer'
                    ? a.appliedAt || new Date().toISOString()
                    : a.appliedAt,
              }
            : a
        )
      );
      setActionNotice(
        `Application for ${app.company} marked as "${nextStatus.charAt(0).toUpperCase() + nextStatus.slice(1)}".`
      );
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err) {
      console.error('Error marking status:', err);
    }
  };

  const handleDownloadPdf = async (app: JobApplication) => {
    if (!app.tailoredResumeMarkdown) {
      alert('Tailored resume not generated yet for this application.');
      return;
    }
    setSelectedResumeApp(app);
    setTimeout(async () => {
      try {
        setDownloading(true);
        const filename = `${app.company}_${app.jobTitle}_Tailored_Resume`.replace(/\s+/g, '_');
        await aiService.downloadResumePdf('modal-resume-preview', filename);
      } catch (err) {
        console.error('Error downloading resume PDF:', err);
      } finally {
        setDownloading(false);
      }
    }, 150);
  };

  const handleConfirmDelete = async () => {
    if (!appToDelete) return;
    try {
      setDeleting(true);
      await applicationService.deleteApplication(appToDelete.id);
      setApplications(prev => prev.filter(a => a.id !== appToDelete.id));
      setActionNotice(
        `Successfully deleted application record for ${appToDelete.company} (${appToDelete.jobTitle}).`
      );
      setTimeout(() => setActionNotice(null), 4000);
      setAppToDelete(null);
    } catch (err) {
      console.error('Failed to delete application:', err);
    } finally {
      setDeleting(false);
    }
  };

  const filteredApps = applications.filter(app => {
    if (activeTab === 'all') return true;
    if (activeTab === 'saved') return app.status === 'saved' || app.status === 'draft';
    return app.status === activeTab;
  });

  const getStatusBadge = (status: ApplicationStatus) => {
    switch (status) {
      case 'applied':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Applied
          </span>
        );
      case 'interviewing':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
            <Calendar className="w-3 h-3 text-sky-600" />
            Interviewing
          </span>
        );
      case 'offer':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <Award className="w-3 h-3 text-purple-600" />
            Offer Received
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <X className="w-3 h-3 text-rose-600" />
            Rejected
          </span>
        );
      case 'saved':
      case 'draft':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Bookmark className="w-3 h-3 text-amber-600" />
            Saved
          </span>
        );
    }
  };

  const appliedCount = applications.filter(a => a.status === 'applied').length;
  const interviewingCount = applications.filter(a => a.status === 'interviewing').length;
  const offerCount = applications.filter(a => a.status === 'offer').length;
  const rejectedCount = applications.filter(a => a.status === 'rejected').length;
  const savedCount = applications.filter(a => a.status === 'saved' || a.status === 'draft').length;

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 space-y-6">
      {/* Action Toast Notice */}
      {actionNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{actionNotice}</span>
          </div>
          <button
            onClick={() => setActionNotice(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">My Job Applications</h1>
          <p className="text-xs text-neutral-500 mt-1">
            Track, mark statuses, and manage all your job applications and saved postings in one place.
          </p>
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1 p-1 bg-neutral-100 rounded-xl overflow-x-auto self-start md:self-auto">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'all'
                ? 'bg-white text-neutral-900 shadow-xs font-semibold'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            All ({applications.length})
          </button>
          <button
            onClick={() => setActiveTab('applied')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'applied'
                ? 'bg-white text-emerald-700 shadow-xs font-semibold'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Applied ({appliedCount})
          </button>
          <button
            onClick={() => setActiveTab('interviewing')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'interviewing'
                ? 'bg-white text-sky-700 shadow-xs font-semibold'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Interviewing ({interviewingCount})
          </button>
          <button
            onClick={() => setActiveTab('offer')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'offer'
                ? 'bg-white text-purple-700 shadow-xs font-semibold'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Offers ({offerCount})
          </button>
          <button
            onClick={() => setActiveTab('rejected')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'rejected'
                ? 'bg-white text-rose-700 shadow-xs font-semibold'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Rejected ({rejectedCount})
          </button>
          <button
            onClick={() => setActiveTab('saved')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'saved'
                ? 'bg-white text-amber-700 shadow-xs font-semibold'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Saved / Drafts ({savedCount})
          </button>
        </div>
      </div>

      {/* Applications List */}
      {loading ? (
        <div className="py-16 text-center text-xs text-neutral-500">
          Loading your job applications...
        </div>
      ) : filteredApps.length === 0 ? (
        <div className="bg-white border border-neutral-200 rounded-xl p-12 text-center shadow-xs">
          <Briefcase className="w-10 h-10 text-neutral-300 mx-auto mb-2" />
          <h3 className="text-base font-semibold text-neutral-800">No applications in this category</h3>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto mt-1">
            Browse real-time job listings to apply or save jobs to your tracker.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredApps.map(app => (
            <div
              key={app.id}
              className="bg-white border border-neutral-200 rounded-xl p-5 shadow-xs hover:border-neutral-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-2 max-w-2xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-neutral-900 text-base">{app.company}</span>
                  {getStatusBadge(app.status)}
                </div>

                <p className="text-sm text-neutral-800 font-semibold">{app.jobTitle}</p>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-500">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    Saved: {new Date(app.createdAt).toLocaleDateString()}
                  </span>
                  {app.appliedAt && (
                    <span className="flex items-center gap-1 text-emerald-600 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Status Updated: {new Date(app.appliedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>

                {/* Mark status interactive picker */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] font-semibold text-neutral-500 flex items-center gap-1 mr-1">
                    <Tag className="w-3 h-3 text-neutral-400" />
                    Mark Status:
                  </span>
                  {(['saved', 'applied', 'interviewing', 'offer', 'rejected'] as ApplicationStatus[]).map(
                    st => (
                      <button
                        key={st}
                        id={`mark-status-${st}-${app.id}`}
                        onClick={() => handleMarkStatus(app, st)}
                        className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all cursor-pointer ${
                          app.status === st
                            ? 'bg-neutral-900 text-white font-semibold shadow-xs'
                            : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900'
                        }`}
                      >
                        {st === 'saved'
                          ? 'Saved'
                          : st.charAt(0).toUpperCase() + st.slice(1)}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 self-end md:self-center shrink-0">
                <button
                  id={`view-job-from-app-${app.id}`}
                  onClick={() => onViewJob(app.jobId)}
                  className="px-3 py-1.5 border border-neutral-200 rounded-lg text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition-colors cursor-pointer"
                >
                  View Job
                </button>

                {app.tailoredResumeMarkdown ? (
                  <>
                    <button
                      id={`view-resume-${app.id}`}
                      onClick={() => setSelectedResumeApp(app)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 border border-neutral-200 rounded-lg text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View Resume</span>
                    </button>

                    <button
                      id={`download-pdf-${app.id}`}
                      onClick={() => handleDownloadPdf(app)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>PDF</span>
                    </button>
                  </>
                ) : null}

                {(app.status === 'draft' || app.status === 'saved') && (
                  <button
                    id={`continue-app-${app.id}`}
                    onClick={() => onContinueApplication(app.jobId)}
                    className="inline-flex items-center gap-1 px-3.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer shadow-xs"
                  >
                    <span>Tailor Resume</span>
                  </button>
                )}

                <button
                  id={`delete-app-btn-${app.id}`}
                  onClick={() => setAppToDelete(app)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                  title="Delete Application"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tailored Resume Inspection Modal */}
      {selectedResumeApp && (
        <div className="fixed inset-0 z-50 bg-neutral-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-neutral-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
              <div>
                <h3 className="text-base font-bold text-neutral-900">
                  Tailored Resume — {selectedResumeApp.company}
                </h3>
                <p className="text-xs text-neutral-500">{selectedResumeApp.jobTitle}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Theme Selector in Modal */}
                <div className="inline-flex bg-neutral-100 p-0.5 rounded-lg border border-neutral-200">
                  <button
                    onClick={() => setModalTheme('executive')}
                    className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                      modalTheme === 'executive'
                        ? 'bg-white text-neutral-900 shadow-xs'
                        : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    Executive
                  </button>
                  <button
                    onClick={() => setModalTheme('modern')}
                    className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                      modalTheme === 'modern'
                        ? 'bg-white text-neutral-900 shadow-xs'
                        : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    Modern
                  </button>
                  <button
                    onClick={() => setModalTheme('minimal')}
                    className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                      modalTheme === 'minimal'
                        ? 'bg-white text-neutral-900 shadow-xs'
                        : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    Minimal
                  </button>
                </div>

                <button
                  onClick={() => aiService.printResume()}
                  title="Print or save vector PDF"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-neutral-300 text-neutral-700 hover:bg-neutral-50 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Print</span>
                </button>

                <button
                  onClick={() => handleDownloadPdf(selectedResumeApp)}
                  disabled={downloading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 text-white rounded-lg text-xs font-medium hover:bg-neutral-800 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{downloading ? 'Downloading...' : 'Download PDF'}</span>
                </button>

                <button
                  onClick={() => setSelectedResumeApp(null)}
                  className="p-1 text-neutral-400 hover:text-neutral-700 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Scrollable Resume Content */}
            <div className="p-6 overflow-y-auto bg-neutral-100 flex justify-center">
              <ResumeDocument
                markdown={selectedResumeApp.tailoredResumeMarkdown || ''}
                theme={modalTheme}
                elementId="modal-resume-preview"
              />
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {appToDelete && (
        <div className="fixed inset-0 z-50 bg-neutral-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-neutral-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-neutral-900">
                  {appToDelete.status === 'draft' ? 'Delete Application Draft?' : 'Remove Application?'}
                </h3>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Are you sure you want to delete the {appToDelete.status === 'draft' ? 'draft' : 'application'} for{' '}
                  <span className="font-semibold text-neutral-800">{appToDelete.jobTitle}</span> at{' '}
                  <span className="font-semibold text-neutral-800">{appToDelete.company}</span>?
                  {appToDelete.tailoredResumeMarkdown &&
                    ' The tailored resume created for this role will also be removed.'}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setAppToDelete(null)}
                disabled={deleting}
                className="px-3.5 py-1.5 border border-neutral-200 rounded-lg text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                id="confirm-delete-draft-btn"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-medium transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{deleting ? 'Deleting...' : 'Confirm Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

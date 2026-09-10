import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { aiService, BuilderTailorResult } from '../services/aiService';
import { resumeHistoryService } from '../services/resumeHistoryService';
import { ResumeBuilderHistoryItem } from '../types';
import { ResumeDocument, ResumeTheme } from '../components/ResumeDocument';
import {
  Sparkles,
  Download,
  FileText,
  Building2,
  Clock,
  History,
  Copy,
  Check,
  Printer,
  Trash2,
  Upload,
  RefreshCw,
  Edit3,
  Eye,
  Briefcase,
  FolderGit2,
  AlertCircle,
  X,
  ChevronRight,
  Search,
  Plus,
  ArrowRight,
} from 'lucide-react';

export const ResumeBuilder: React.FC = () => {
  const { user, profile } = useAuth();

  // Three Core Inputs
  const [companyName, setCompanyName] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [resumeText, setResumeText] = useState('');

  // Source Tracking
  const [isUsingProfileResume, setIsUsingProfileResume] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  // Tailoring State
  const [isTailoring, setIsTailoring] = useState(false);
  const [tailorResult, setTailorResult] = useState<BuilderTailorResult | null>(null);
  const [editedResume, setEditedResume] = useState('');
  const [activeTab, setActiveTab] = useState<'preview' | 'experience' | 'projects' | 'edit'>('preview');
  const [theme, setTheme] = useState<ResumeTheme>('executive');
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);

  // Notifications & Feedback
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  // History Drawer State
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyList, setHistoryList] = useState<ResumeBuilderHistoryItem[]>([]);
  const [historySearch, setHistorySearch] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pre-populate with profile resume on mount or when profile loads
  useEffect(() => {
    if (profile?.baseResumeText && !uploadedFileName) {
      setResumeText(profile.baseResumeText);
      setIsUsingProfileResume(true);
    }
  }, [profile?.baseResumeText, uploadedFileName]);

  // Fetch History for user
  const fetchHistory = async () => {
    if (!user) return;
    try {
      setLoadingHistory(true);
      const items = await resumeHistoryService.getResumeHistoryByUser(user.uid);
      setHistoryList(items);
    } catch (err) {
      console.warn('Error fetching history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [user]);

  // Handle File Upload & Extraction
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setError(null);
      setUploadedFileName(file.name);
      setIsUsingProfileResume(false);

      if (file.type === 'text/plain') {
        const text = await file.text();
        setResumeText(text);
        setIsUploading(false);
        return;
      }

      // Convert to base64 and extract through server
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = reader.result as string;
          const resp = await fetch('/api/ai/extract-resume', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              base64Data,
              mimeType: file.type || 'application/pdf',
              fileName: file.name,
            }),
          });

          if (!resp.ok) {
            const errJson = await resp.json().catch(() => ({}));
            throw new Error(errJson.error || 'Failed to extract resume text.');
          }

          const parsed = await resp.json();
          const extractedText =
            parsed?.data?.baseResumeText ||
            parsed?.baseResumeText ||
            parsed?.data?.summary ||
            parsed?.text ||
            (parsed?.data && typeof parsed.data === 'string' ? parsed.data : '');

          if (extractedText && extractedText.trim()) {
            setResumeText(extractedText.trim());
          } else {
            throw new Error('No readable text extracted from document.');
          }
        } catch (err: any) {
          console.error('File extract error:', err);
          setError(err?.message || 'Failed to parse resume file.');
        } finally {
          setIsUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      console.error('File upload error:', err);
      setError(err?.message || 'Failed to process file.');
      setIsUploading(false);
    }
  };

  // Trigger Tailoring (Align Projects & Experience to JD)
  const handleGenerateTailoredResume = async () => {
    if (!companyName.trim()) {
      setError('Please provide the target Company Name.');
      return;
    }
    if (!jobDescription.trim()) {
      setError('Please provide the target Job Description (JD).');
      return;
    }
    if (!resumeText.trim()) {
      setError('Please provide or upload your Resume content.');
      return;
    }

    try {
      setIsTailoring(true);
      setError(null);
      setSuccessMessage(null);

      // Model configuration from user profile if customized
      const modelConfig = {
        aiModel: profile?.aiModel,
        customApiKey: profile?.customApiKey,
        customModelName: profile?.customModelName,
        customModelProvider: profile?.customModelProvider,
      };

      const result = await aiService.builderTailor({
        companyName: companyName.trim(),
        jobDescription: jobDescription.trim(),
        resumeText: resumeText.trim(),
        modelConfig,
      });

      setTailorResult(result);
      setEditedResume(result.markdown);
      setActiveTab('preview');

      // Save to History immediately
      if (user) {
        const historyRecord = await resumeHistoryService.saveResumeHistory({
          userId: user.uid,
          companyName: companyName.trim(),
          jobDescription: jobDescription.trim(),
          originalResume: resumeText.trim(),
          tailoredResumeMarkdown: result.markdown,
          updatedExperienceMarkdown: result.updatedExperience,
          updatedProjectsMarkdown: result.updatedProjects,
          modelUsed: result.modelUsed,
        });
        setActiveHistoryId(historyRecord.id);
        fetchHistory();
      }

      setSuccessMessage(`Resume successfully aligned for ${companyName}! Layout preserved.`);
    } catch (err: any) {
      console.error('Tailoring error:', err);
      setError(err?.message || 'Failed to align resume. Please try again.');
    } finally {
      setIsTailoring(false);
    }
  };

  // Reset to Base Profile Resume
  const handleResetToProfileResume = () => {
    if (profile?.baseResumeText) {
      setResumeText(profile.baseResumeText);
      setIsUsingProfileResume(true);
      setUploadedFileName(null);
      setSuccessMessage('Restored resume from your profile.');
    } else {
      setError('No base resume found in your profile. Please paste your resume text.');
    }
  };

  // Load an item from History
  const handleLoadHistoryItem = (item: ResumeBuilderHistoryItem) => {
    setCompanyName(item.companyName);
    setJobDescription(item.jobDescription);
    setResumeText(item.originalResume);
    setEditedResume(item.tailoredResumeMarkdown);
    setTailorResult({
      markdown: item.tailoredResumeMarkdown,
      updatedExperience: item.updatedExperienceMarkdown,
      updatedProjects: item.updatedProjectsMarkdown,
      modelUsed: item.modelUsed,
    });
    setActiveHistoryId(item.id);
    setActiveTab('preview');
    setHistoryOpen(false);
    setSuccessMessage(`Loaded resume version for ${item.companyName}`);
  };

  // Delete an item from History
  const handleDeleteHistoryItem = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm('Delete this saved resume from history?')) return;

    try {
      await resumeHistoryService.deleteResumeHistory(id, user?.uid);
      setHistoryList(prev => prev.filter(i => i.id !== id));
      if (activeHistoryId === id) {
        setActiveHistoryId(null);
      }
    } catch (err) {
      console.error('Failed to delete history item:', err);
    }
  };

  // Reset Form for New Resume
  const handleStartNewResume = () => {
    setCompanyName('');
    setJobDescription('');
    if (profile?.baseResumeText) {
      setResumeText(profile.baseResumeText);
      setIsUsingProfileResume(true);
    } else {
      setResumeText('');
      setIsUsingProfileResume(false);
    }
    setTailorResult(null);
    setEditedResume('');
    setActiveHistoryId(null);
    setUploadedFileName(null);
    setError(null);
    setSuccessMessage(null);
  };

  // Copy to Clipboard
  const handleCopyMarkdown = async () => {
    const textToCopy = editedResume || tailorResult?.markdown || resumeText;
    if (!textToCopy) return;

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Clipboard copy failed:', err);
    }
  };

  // Download PDF
  const handleDownloadPdf = async () => {
    const docId = 'builder-resume-document';
    const filename = `${profile?.name || 'Candidate'}_${companyName || 'Target'}_Resume`;
    try {
      setIsDownloadingPdf(true);
      await aiService.downloadResumePdf(docId, filename);
    } catch (err: any) {
      console.error('Download PDF error:', err);
      setError(err?.message || 'Failed to generate PDF. You can also use the browser Print option.');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // Download Markdown file
  const handleDownloadMarkdown = () => {
    const textToDownload = editedResume || tailorResult?.markdown || resumeText;
    if (!textToDownload) return;
    const filename = `${profile?.name || 'Candidate'}_${companyName || 'Target'}_Resume`;
    aiService.downloadResumeFile(textToDownload, filename, 'md');
  };

  // Download Text file
  const handleDownloadText = () => {
    const textToDownload = editedResume || tailorResult?.markdown || resumeText;
    if (!textToDownload) return;
    const filename = `${profile?.name || 'Candidate'}_${companyName || 'Target'}_Resume`;
    aiService.downloadResumeFile(textToDownload, filename, 'txt');
  };

  // Filtered History
  const filteredHistory = historyList.filter(item =>
    item.companyName.toLowerCase().includes(historySearch.toLowerCase()) ||
    item.jobDescription.toLowerCase().includes(historySearch.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-neutral-200">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-neutral-900 to-neutral-700 text-white flex items-center justify-center shadow-sm">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 flex items-center gap-2">
                Resume Builder
                <span className="text-[11px] font-semibold tracking-normal px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Layout Preserved
                </span>
              </h1>
              <p className="text-xs text-neutral-500 mt-0.5">
                Provide Company Name, JD, and Resume. Only Experience & Projects are tailored; all original layout and sections stay intact.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={handleStartNewResume}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Resume</span>
          </button>

          <button
            onClick={() => setHistoryOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-neutral-900 bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 rounded-lg transition-colors cursor-pointer"
          >
            <History className="w-3.5 h-3.5 text-neutral-700" />
            <span>History</span>
            <span className="px-1.5 py-0.2 rounded-full bg-neutral-900 text-white text-[10px] font-bold">
              {historyList.length}
            </span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-600 hover:text-red-900">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-600 hover:text-emerald-900">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Two-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: 3 Core Inputs */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h2 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-neutral-900 text-white text-[11px] font-bold flex items-center justify-center">
                  1
                </span>
                Target Inputs
              </h2>
              <span className="text-[11px] text-neutral-500 font-medium">3 Inputs Required</span>
            </div>

            {/* Input 1: Company Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-800 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-neutral-600" />
                  Company Name <span className="text-red-500">*</span>
                </span>
                <span className="text-[10px] text-neutral-500 font-normal">e.g., Google, Amazon, Stripe</span>
              </label>
              <input
                id="builder-company-input"
                type="text"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                placeholder="Enter target company name..."
                className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 transition-shadow"
              />
            </div>

            {/* Input 2: Job Description (JD) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-neutral-800 flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-neutral-600" />
                  Job Description (JD) <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-neutral-400">
                    {jobDescription ? `${jobDescription.length} chars` : 'Paste text'}
                  </span>
                  {jobDescription && (
                    <button
                      onClick={() => setJobDescription('')}
                      className="text-[10px] text-neutral-400 hover:text-neutral-700 underline"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
              <textarea
                id="builder-jd-input"
                rows={7}
                value={jobDescription}
                onChange={e => setJobDescription(e.target.value)}
                placeholder="Paste the target Job Description (responsibilities, required skills, tools, qualification)..."
                className="w-full p-3 rounded-lg border border-neutral-300 text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 transition-shadow leading-relaxed"
              />
            </div>

            {/* Input 3: Resume (Pre-loaded from Profile, no need to re-upload) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-neutral-800 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-neutral-600" />
                  Candidate Resume
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    From Profile
                  </span>
                </label>

                <div className="flex items-center gap-2">
                  {profile?.baseResumeText && !isUsingProfileResume && (
                    <button
                      type="button"
                      onClick={handleResetToProfileResume}
                      title="Switch back to profile resume"
                      className="text-[11px] text-neutral-600 hover:text-neutral-900 font-medium underline flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Use Profile Resume
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-[11px] text-neutral-600 hover:text-neutral-900 font-medium hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Upload className="w-3 h-3" />
                    {resumeText ? 'Change File' : 'Upload File'}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.txt,.md"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Background Processing Indicator */}
              {isUploading ? (
                <div className="p-5 rounded-xl border-2 border-dashed border-neutral-300 bg-neutral-50 text-center space-y-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-neutral-700 mx-auto" />
                  <p className="text-xs font-bold text-neutral-900">Processing Resume in Background...</p>
                  <p className="text-[11px] text-neutral-500">Preparing document structure for tailoring</p>
                </div>
              ) : resumeText ? (
                /* Active Attached Resume Card */
                <div className="p-4 rounded-xl border border-emerald-200/80 bg-emerald-50/20 hover:bg-emerald-50/30 transition-colors space-y-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-neutral-900 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <FileText className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-neutral-900 truncate">
                          {uploadedFileName ||
                            (isUsingProfileResume
                              ? profile?.baseResumeFileName || `${profile?.name || 'Candidate'}_Resume.pdf`
                              : 'Attached_Resume.pdf')}
                        </p>
                        <p className="text-[11px] text-emerald-700 font-medium flex items-center gap-1 mt-0.5">
                          <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span>
                            {isUsingProfileResume
                              ? 'Profile resume loaded automatically • No need to upload'
                              : 'Custom document attached for this job'}
                          </span>
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-2.5 py-1 rounded-lg border border-neutral-300 bg-white hover:bg-neutral-100 text-neutral-800 text-[11px] font-medium transition-colors cursor-pointer shrink-0 shadow-xs"
                    >
                      Change
                    </button>
                  </div>

                  <div className="pt-2 border-t border-emerald-200/50 flex items-center justify-between text-[10px] text-neutral-500">
                    <span>
                      {isUsingProfileResume
                        ? '✓ Default: Sourced from your Profile'
                        : 'Using one-off session upload'}
                    </span>
                    {isUsingProfileResume && (
                      <span className="text-neutral-600 font-medium">
                        Ready to tailor
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                /* Empty Upload Alert */
                <div className="p-5 rounded-xl border-2 border-dashed border-amber-300 bg-amber-50/40 text-center space-y-2">
                  <AlertCircle className="w-6 h-6 text-amber-600 mx-auto" />
                  <p className="text-xs font-bold text-neutral-900">
                    No Resume Attached in Profile
                  </p>
                  <p className="text-[11px] text-neutral-600 max-w-xs mx-auto">
                    Resume upload is mandatory in your Profile. Upload once there and it will be loaded here automatically every time.
                  </p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 text-white text-xs font-semibold hover:bg-neutral-800 cursor-pointer shadow-xs mt-1"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Upload Resume Now
                  </button>
                </div>
              )}
            </div>

            {/* Notice on Preservation */}
            <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-lg text-[11px] text-neutral-600 flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-neutral-900 shrink-0 mt-0.5" />
              <span>
                <strong>Format Guard:</strong> The candidate’s header, contact info, education, and section alignment will remain identical. Only the <strong>Experience</strong> and <strong>Projects</strong> bullet points are targeted and aligned with the JD.
              </span>
            </div>

            {/* Action Trigger Button */}
            <button
              id="builder-align-btn"
              onClick={handleGenerateTailoredResume}
              disabled={isTailoring || isUploading || !companyName.trim() || !jobDescription.trim() || !resumeText.trim()}
              className={`w-full py-3 px-4 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer ${
                isTailoring || isUploading || !companyName.trim() || !jobDescription.trim() || !resumeText.trim()
                  ? 'bg-neutral-300 cursor-not-allowed text-neutral-500'
                  : 'bg-neutral-900 hover:bg-neutral-800 active:scale-[0.99] shadow-md hover:shadow-lg'
              }`}
            >
              {isTailoring ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-amber-300" />
                  <span>Aligning Experience & Projects to JD...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Align Experience & Projects to JD</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Results, Tabs, Preview & Export */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-xl border border-neutral-200 shadow-xs overflow-hidden">
            {/* Action & View Toolbar */}
            <div className="border-b border-neutral-200 p-4 bg-neutral-50/50 flex flex-wrap items-center justify-between gap-3">
              {/* Tab Navigation */}
              <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-neutral-200 shadow-xs">
                <button
                  onClick={() => setActiveTab('preview')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                    activeTab === 'preview'
                      ? 'bg-neutral-900 text-white shadow-xs'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Full Resume</span>
                </button>

                {tailorResult?.updatedExperience && (
                  <button
                    onClick={() => setActiveTab('experience')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                      activeTab === 'experience'
                        ? 'bg-neutral-900 text-white shadow-xs'
                        : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    <Briefcase className="w-3.5 h-3.5" />
                    <span>Experience</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  </button>
                )}

                {tailorResult?.updatedProjects && (
                  <button
                    onClick={() => setActiveTab('projects')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                      activeTab === 'projects'
                        ? 'bg-neutral-900 text-white shadow-xs'
                        : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    <FolderGit2 className="w-3.5 h-3.5" />
                    <span>Projects</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  </button>
                )}

                <button
                  onClick={() => setActiveTab('edit')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                    activeTab === 'edit'
                      ? 'bg-neutral-900 text-white shadow-xs'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Direct Editor</span>
                </button>
              </div>

              {/* Theme & Actions Toolbar */}
              <div className="flex items-center gap-2">
                {activeTab === 'preview' && (
                  <div className="flex items-center gap-1 text-xs text-neutral-600 bg-white border border-neutral-200 rounded-lg px-2 py-1">
                    <span className="text-[11px] text-neutral-400">Theme:</span>
                    <select
                      value={theme}
                      onChange={e => setTheme(e.target.value as ResumeTheme)}
                      className="text-xs font-medium text-neutral-800 bg-transparent border-none focus:outline-none cursor-pointer"
                    >
                      <option value="executive">Executive</option>
                      <option value="modern">Modern</option>
                      <option value="minimal">Minimal</option>
                    </select>
                  </div>
                )}

                <button
                  onClick={handleCopyMarkdown}
                  title="Copy Resume Markdown"
                  className="p-2 rounded-lg border border-neutral-200 bg-white text-neutral-700 hover:text-neutral-900 hover:bg-neutral-50 transition-colors cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>

                <button
                  onClick={() => window.print()}
                  title="Print Resume"
                  className="p-2 rounded-lg border border-neutral-200 bg-white text-neutral-700 hover:text-neutral-900 hover:bg-neutral-50 transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                </button>

                {/* Dropdown / Download Buttons */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleDownloadPdf}
                    disabled={isDownloadingPdf || (!editedResume && !tailorResult && !resumeText)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 text-white text-xs font-bold hover:bg-neutral-800 transition-colors shadow-xs cursor-pointer disabled:bg-neutral-300"
                  >
                    <Download className={`w-3.5 h-3.5 ${isDownloadingPdf ? 'animate-bounce' : ''}`} />
                    <span>{isDownloadingPdf ? 'Exporting...' : 'Download PDF'}</span>
                  </button>

                  <button
                    onClick={handleDownloadMarkdown}
                    title="Download as Markdown (.md)"
                    className="px-2.5 py-1.5 rounded-lg border border-neutral-200 bg-white text-neutral-700 hover:text-neutral-900 text-xs font-semibold hover:bg-neutral-50 cursor-pointer"
                  >
                    .md
                  </button>

                  <button
                    onClick={handleDownloadText}
                    title="Download as Plain Text (.txt)"
                    className="px-2.5 py-1.5 rounded-lg border border-neutral-200 bg-white text-neutral-700 hover:text-neutral-900 text-xs font-semibold hover:bg-neutral-50 cursor-pointer"
                  >
                    .txt
                  </button>
                </div>
              </div>
            </div>

            {/* Content Area Based on Active Tab */}
            <div className="p-6 bg-neutral-100/50 min-h-[600px] flex flex-col justify-start">
              {/* Tab 1: Full Document Preview */}
              {activeTab === 'preview' && (
                <div className="w-full">
                  {tailorResult || editedResume || resumeText ? (
                    <div className="bg-white p-6 sm:p-8 rounded-xl border border-neutral-200 shadow-md">
                      <ResumeDocument
                        markdown={editedResume || tailorResult?.markdown || resumeText}
                        theme={theme}
                        elementId="builder-resume-document"
                        isEditable={false}
                      />
                    </div>
                  ) : (
                    <div className="h-[450px] flex flex-col items-center justify-center text-center p-6 space-y-3">
                      <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-400">
                        <FileText className="w-6 h-6" />
                      </div>
                      <h3 className="text-sm font-bold text-neutral-800">No Resume Generated Yet</h3>
                      <p className="text-xs text-neutral-500 max-w-sm">
                        Fill in the Company Name and Job Description on the left, then click <strong>Align Experience & Projects</strong> to generate your tailored resume.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Focused Aligned Experience */}
              {activeTab === 'experience' && (
                <div className="w-full space-y-4">
                  <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                      <div>
                        <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
                          <Briefcase className="w-4 h-4 text-emerald-600" />
                          Aligned Professional Experience
                        </h3>
                        <p className="text-xs text-neutral-500 mt-0.5">
                          Extracted Experience section rewritten to match keywords & tech stack for {companyName || 'the target company'}.
                        </p>
                      </div>
                      <span className="text-[11px] px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                        Targeted for {companyName}
                      </span>
                    </div>

                    <div className="bg-neutral-50 p-4 rounded-lg border border-neutral-200 text-xs text-neutral-800 whitespace-pre-wrap font-sans leading-relaxed">
                      {tailorResult?.updatedExperience || 'No specific Experience extracted.'}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: Focused Aligned Projects */}
              {activeTab === 'projects' && (
                <div className="w-full space-y-4">
                  <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                      <div>
                        <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
                          <FolderGit2 className="w-4 h-4 text-indigo-600" />
                          Aligned Projects & Highlights
                        </h3>
                        <p className="text-xs text-neutral-500 mt-0.5">
                          Projects reframed to emphasize domain relevance, system design, and technologies for {companyName}.
                        </p>
                      </div>
                      <span className="text-[11px] px-2.5 py-1 rounded bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200">
                        Targeted for {companyName}
                      </span>
                    </div>

                    <div className="bg-neutral-50 p-4 rounded-lg border border-neutral-200 text-xs text-neutral-800 whitespace-pre-wrap font-sans leading-relaxed">
                      {tailorResult?.updatedProjects || 'No specific Projects section extracted.'}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 4: Direct Markdown Editor */}
              {activeTab === 'edit' && (
                <div className="w-full space-y-4">
                  <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-sm space-y-3">
                    <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                      <div>
                        <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
                          <Edit3 className="w-4 h-4 text-neutral-700" />
                          Direct Resume Markdown Editor
                        </h3>
                        <p className="text-xs text-neutral-500 mt-0.5">
                          Fine-tune any line, contact detail, or bullet point before downloading.
                        </p>
                      </div>
                      <button
                        onClick={async () => {
                          if (activeHistoryId && user) {
                            await resumeHistoryService.updateResumeHistory(
                              activeHistoryId,
                              { tailoredResumeMarkdown: editedResume },
                              user.uid
                            );
                            setSuccessMessage('Saved changes to active history record.');
                          } else {
                            setSuccessMessage('Updated working copy.');
                          }
                        }}
                        className="px-3 py-1.5 rounded-lg bg-neutral-900 text-white text-xs font-semibold hover:bg-neutral-800 transition-colors shadow-xs cursor-pointer"
                      >
                        Save Edits
                      </button>
                    </div>

                    <textarea
                      rows={25}
                      value={editedResume || tailorResult?.markdown || resumeText}
                      onChange={e => setEditedResume(e.target.value)}
                      className="w-full p-4 font-mono text-xs text-neutral-900 bg-neutral-50 rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900 leading-relaxed"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* History Slide-Over Drawer */}
      {historyOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity animate-fade-in">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col border-l border-neutral-200">
            {/* Drawer Header */}
            <div className="p-5 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/70">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-neutral-800" />
                <h3 className="font-bold text-neutral-900 text-base">Resume History</h3>
                <span className="px-2 py-0.5 rounded-full bg-neutral-200 text-neutral-800 text-[11px] font-bold">
                  {historyList.length}
                </span>
              </div>
              <button
                onClick={() => setHistoryOpen(false)}
                className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Bar */}
            <div className="p-3 border-b border-neutral-100">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-neutral-400" />
                <input
                  type="text"
                  value={historySearch}
                  onChange={e => setHistorySearch(e.target.value)}
                  placeholder="Search by company or JD..."
                  className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loadingHistory ? (
                <div className="py-12 text-center text-xs text-neutral-400">Loading history...</div>
              ) : filteredHistory.length === 0 ? (
                <div className="py-16 text-center text-neutral-400 space-y-2">
                  <History className="w-8 h-8 mx-auto text-neutral-300" />
                  <p className="text-xs font-medium">No saved resumes found</p>
                  <p className="text-[11px] text-neutral-400">
                    Generated resumes for target companies will automatically appear here.
                  </p>
                </div>
              ) : (
                filteredHistory.map(item => (
                  <div
                    key={item.id}
                    onClick={() => handleLoadHistoryItem(item)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer hover:shadow-md ${
                      activeHistoryId === item.id
                        ? 'border-neutral-900 bg-neutral-50/70 ring-1 ring-neutral-900'
                        : 'border-neutral-200 bg-white hover:border-neutral-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-xs text-neutral-900 flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-neutral-700" />
                            {item.companyName}
                          </h4>
                          {activeHistoryId === item.id && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-900 text-white font-bold">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-neutral-500 line-clamp-2 leading-relaxed">
                          {item.jobDescription.substring(0, 110)}...
                        </p>
                      </div>

                      <button
                        onClick={e => handleDeleteHistoryItem(e, item.id)}
                        title="Delete from history"
                        className="text-neutral-400 hover:text-red-600 p-1 rounded hover:bg-neutral-100 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="mt-3 pt-2 border-t border-neutral-100 flex items-center justify-between text-[10px] text-neutral-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(item.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>

                      <span className="text-neutral-700 font-semibold flex items-center gap-0.5 hover:underline">
                        Load in Builder
                        <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-neutral-200 bg-neutral-50 flex items-center justify-between">
              <span className="text-[11px] text-neutral-500">
                All records backed up in Firestore & cache
              </span>
              <button
                onClick={() => setHistoryOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-neutral-300 text-xs font-medium text-neutral-700 hover:bg-white cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

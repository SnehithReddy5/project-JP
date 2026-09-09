import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { userService } from '../services/userService';
import {
  User, Mail, Phone, Globe, MapPin, Briefcase, Upload,
  CheckCircle2, AlertCircle, Loader2, Sparkles, Bot, KeyRound,
  ChevronDown, ChevronUp, Shield, Zap, Star,
} from 'lucide-react';

const COUNTRIES = ['USA', 'India', 'UK', 'Canada', 'Australia', 'Germany', 'Singapore', 'UAE'];

const POPULAR_LOCATIONS: Record<string, string[]> = {
  USA: ['San Francisco', 'New York', 'Seattle', 'Austin', 'Boston', 'Chicago', 'Remote'],
  India: ['Hyderabad', 'Bangalore', 'Mumbai', 'Chennai', 'Delhi NCR', 'Pune'],
  UK: ['London', 'Manchester', 'Birmingham', 'Edinburgh', 'Cambridge'],
  Canada: ['Toronto', 'Vancouver', 'Montreal', 'Ottawa', 'Calgary'],
  Australia: ['Sydney', 'Melbourne', 'Brisbane', 'Perth'],
  Germany: ['Berlin', 'Munich', 'Frankfurt', 'Hamburg'],
  Singapore: ['Singapore'],
  UAE: ['Dubai', 'Abu Dhabi'],
};

// Curated AI model catalog
interface AiModelOption {
  id: string;
  label: string;
  provider: 'groq' | 'google' | 'openai' | 'anthropic' | 'mistral' | 'other';
  badge: 'Free' | 'Premium' | 'Fast' | 'Powerful';
  description: string;
  requiresKey: boolean;
  color: string;
}

const AI_MODELS: AiModelOption[] = [
  {
    id: 'openai/gpt-oss-120b',
    label: 'openai/gpt-oss-120b',
    provider: 'openai',
    badge: 'Powerful',
    description: "OpenAI's premier 117B parameter open-weight reasoning model for ATS resume tailoring.",
    requiresKey: false,
    color: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  },
];

const PROVIDER_LABELS: Record<string, string> = {
  openai: 'OpenAI (Open-Weight)',
};

const BADGE_STYLES: Record<string, string> = {
  Free: 'bg-emerald-100 text-emerald-800',
  Fast: 'bg-blue-100 text-blue-800',
  Powerful: 'bg-violet-100 text-violet-800',
  Premium: 'bg-amber-100 text-amber-800',
};

interface ProfileSetupProps {
  onCompleted: () => void;
  isEditing?: boolean;
}

export const ProfileSetup: React.FC<ProfileSetupProps> = ({ onCompleted, isEditing = false }) => {
  const { user, profile, refreshProfile } = useAuth();

  const [name, setName] = useState(profile?.name || user?.displayName || '');
  const [email] = useState(profile?.email || user?.email || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [country, setCountry] = useState(profile?.country || 'USA');
  const [location, setLocation] = useState(profile?.location || 'San Francisco');
  const [jobRole, setJobRole] = useState(profile?.jobRole || 'Software Engineer');
  const [baseResumeText, setBaseResumeText] = useState(profile?.baseResumeText || '');
  const [resumeFileName, setResumeFileName] = useState(profile?.baseResumeFileName || 'base_resume.txt');

  // AI Model state
  const [selectedModelId, setSelectedModelId] = useState('openai/gpt-oss-120b');
  const [customApiKey, setCustomApiKey] = useState(profile?.customApiKey || '');
  const [customModelName, setCustomModelName] = useState(profile?.customModelName || '');
  const [showAiSection, setShowAiSection] = useState(isEditing);
  const [showApiKey, setShowApiKey] = useState(false);

  const [saving, setSaving] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractedNotice, setExtractedNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileFeedback, setFileFeedback] = useState<string | null>(null);

  const locationSuggestions = POPULAR_LOCATIONS[country] || ['Remote', 'Capital City'];

  const selectedModel = AI_MODELS.find(m => m.id === selectedModelId) || AI_MODELS[0];
  const isCustom = selectedModelId === '__custom__';

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setResumeFileName(file.name);
    setExtracting(true);
    setFileFeedback(`Analyzing and extracting resume details from "${file.name}" with AI...`);
    setError(null);
    setExtractedNotice(null);

    try {
      let base64Data: string | undefined = undefined;
      let textContent: string | undefined = undefined;

      if (file.type.includes('text') || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
        textContent = await file.text();
      } else {
        const arrayBuffer = await file.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        base64Data = btoa(binary);
      }

      const res = await fetch('/api/ai/extract-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base64Data,
          mimeType: file.type || 'application/pdf',
          textContent,
          fileName: file.name,
        }),
      });

      if (!res.ok) throw new Error(`Resume extraction failed with status ${res.status}`);

      const result = await res.json();
      if (result?.data) {
        const extracted = result.data;
        if (extracted.name?.trim()) setName(extracted.name.trim());
        if (extracted.phone?.trim()) setPhone(extracted.phone.trim());
        if (extracted.location?.trim()) setLocation(extracted.location.trim());
        if (extracted.country && COUNTRIES.includes(extracted.country)) setCountry(extracted.country);
        if (extracted.jobRole?.trim()) setJobRole(extracted.jobRole.trim());
        if (extracted.baseResumeText?.trim()) setBaseResumeText(extracted.baseResumeText.trim());

        setFileFeedback(null);
        setExtractedNotice(
          `Resume parsed successfully from "${file.name}"! Candidate name, phone, target role, and formatted ATS resume have been extracted and populated into your profile.`
        );
      } else {
        setFileFeedback(`Loaded ${file.name}. Please review details below.`);
      }
    } catch (err: any) {
      console.error('Resume extraction error:', err);
      if (file.type.includes('text') || file.name.endsWith('.txt')) {
        try { const txt = await file.text(); setBaseResumeText(txt); } catch {}
      }
      setFileFeedback(`Uploaded "${file.name}". You can inspect or tweak the extracted textual profile below.`);
    } finally {
      setExtracting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!name.trim()) { setError('Please provide your full name.'); return; }
    if (!phone.trim()) { setError('Please provide your phone number.'); return; }
    if (!location.trim()) { setError('Please select or enter your location city.'); return; }
    if (!jobRole.trim()) { setError('Please specify your target job role.'); return; }
    if (!baseResumeText.trim()) { setError('Please upload or provide your base resume details.'); return; }
    if (selectedModel.requiresKey && !customApiKey.trim() && !isCustom) {
      setError(`An API key is required for ${selectedModel.label}. Please enter your API key below.`);
      return;
    }
    if (isCustom && !customModelName.trim()) {
      setError('Please enter the custom model name/identifier.');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      await userService.createUserProfile({
        id: user.uid,
        email,
        name: name.trim(),
        phone: phone.trim(),
        country,
        location: location.trim(),
        jobRole: jobRole.trim(),
        baseResumeText: baseResumeText.trim(),
        baseResumeFileName: resumeFileName,
        baseResumeUrl: '',
        aiModel: selectedModelId,
        customApiKey: customApiKey.trim() || undefined,
        customModelName: isCustom ? customModelName.trim() : undefined,
        customModelProvider: selectedModel.provider,
      } as any);

      await refreshProfile();
      onCompleted();
    } catch (err: any) {
      console.error('Save profile error:', err);
      setError(err?.message || 'Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const groupedModels = AI_MODELS.reduce((acc, m) => {
    const p = m.provider;
    if (!acc[p]) acc[p] = [];
    acc[p].push(m);
    return acc;
  }, {} as Record<string, AiModelOption[]>);

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 sm:px-6">
      <div className="bg-white border border-neutral-200 rounded-xl shadow-sm p-6 sm:p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">
            {isEditing ? 'Profile Settings' : 'Complete Your Profile'}
          </h1>
          <p className="text-sm text-neutral-600 mt-1">
            Configure your personal information, job preferences, base resume, and AI model for tailoring.
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Info */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-neutral-900 uppercase tracking-wider">Personal Information</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                  <input
                    id="profile-name-input"
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="John Doe"
                    required
                    className="w-full pl-9 pr-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">Email (From Google)</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                  <input
                    id="profile-email-input"
                    type="email"
                    value={email}
                    disabled
                    className="w-full pl-9 pr-3 py-2 text-sm border border-neutral-200 bg-neutral-100 text-neutral-500 rounded-lg cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">Phone Number</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                <input
                  id="profile-phone-input"
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  required
                  className="w-full pl-9 pr-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Job Preferences */}
          <div className="border-t border-neutral-100 pt-5 space-y-4">
            <h2 className="text-sm font-semibold text-neutral-900 uppercase tracking-wider">Job Preferences & Location</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">Country</label>
                <div className="relative">
                  <Globe className="w-4 h-4 text-neutral-400 absolute left-3 top-3 pointer-events-none" />
                  <select
                    id="profile-country-select"
                    value={country}
                    onChange={e => {
                      setCountry(e.target.value);
                      const defaults = POPULAR_LOCATIONS[e.target.value];
                      if (defaults?.length > 0) setLocation(defaults[0]);
                    }}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                  >
                    {COUNTRIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">Location (City)</label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                  <input
                    id="profile-location-input"
                    type="text"
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    placeholder="e.g. San Francisco"
                    required
                    className="w-full pl-9 pr-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                  />
                </div>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {locationSuggestions.map(loc => (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => setLocation(loc)}
                      className={`text-xs px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                        location.toLowerCase() === loc.toLowerCase()
                          ? 'bg-neutral-900 text-white border-neutral-900'
                          : 'bg-neutral-50 text-neutral-600 border-neutral-200 hover:bg-neutral-100'
                      }`}
                    >
                      {loc}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">Target Job Role</label>
              <div className="relative">
                <Briefcase className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                <input
                  id="profile-jobrole-input"
                  type="text"
                  value={jobRole}
                  onChange={e => setJobRole(e.target.value)}
                  placeholder="e.g. React Developer, Full Stack Engineer"
                  required
                  className="w-full pl-9 pr-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Base Resume */}
          <div className="border-t border-neutral-100 pt-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-neutral-900 uppercase tracking-wider">Base Resume</h2>
              <span className="text-xs text-neutral-500">Kept intact as your source of truth</span>
            </div>

            <div className="border-2 border-dashed border-neutral-200 rounded-lg p-5 text-center hover:border-neutral-400 transition-colors bg-neutral-50/50">
              {extracting ? (
                <div className="py-3 flex flex-col items-center justify-center space-y-2">
                  <Loader2 className="w-8 h-8 text-neutral-900 animate-spin" />
                  <p className="text-sm font-semibold text-neutral-900">AI Extracting Resume Details...</p>
                  <p className="text-xs text-neutral-500 max-w-sm">
                    Parsing your PDF/document to automatically fill your Name, Contact, Role, and ATS-optimized resume.
                  </p>
                </div>
              ) : (
                <>
                  <Upload className="w-7 h-7 text-neutral-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-neutral-800">Upload your resume file (PDF, TXT, DOCX)</p>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Our AI will parse and extract your profile details, contact info, and experience automatically.
                  </p>
                  <input
                    id="resume-file-input"
                    type="file"
                    accept=".pdf,.txt,.md,.docx,.doc"
                    onChange={handleFileUpload}
                    disabled={extracting}
                    className="mt-3 text-xs text-neutral-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-neutral-900 file:text-white hover:file:bg-neutral-800 cursor-pointer disabled:opacity-50"
                  />
                </>
              )}

              {fileFeedback && !extracting && (
                <p className="text-xs text-neutral-600 font-medium mt-2 flex items-center justify-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-neutral-500" />
                  {fileFeedback}
                </p>
              )}
            </div>

            {extractedNotice && (
              <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-emerald-950">AI Extraction Complete</p>
                  <p className="mt-0.5 text-emerald-800">{extractedNotice}</p>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Base Resume Content (Used by AI Tailoring)
              </label>
              <textarea
                id="profile-resume-textarea"
                rows={9}
                value={baseResumeText}
                onChange={e => setBaseResumeText(e.target.value)}
                placeholder="Paste your plain text or Markdown resume here, or upload your resume file above (PDF/DOCX)..."
                className="w-full p-3 font-mono text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent leading-relaxed"
              />
              <p className="text-xs text-neutral-500 mt-1">
                The AI will use only the authentic facts, companies, and skills present in this base resume.
              </p>
            </div>
          </div>

          {/* ========== AI MODEL SELECTOR ========== */}
          <div className="border-t border-neutral-100 pt-5">
            <button
              type="button"
              onClick={() => setShowAiSection(!showAiSection)}
              className="w-full flex items-center justify-between cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center shadow-sm">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="text-left">
                  <h2 className="text-sm font-semibold text-neutral-900 uppercase tracking-wider">AI Model Settings</h2>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Current: <span className="font-medium text-neutral-700">{selectedModel.label}</span>
                    {customApiKey ? (
                      <span className="ml-2 inline-flex items-center gap-1 text-emerald-700">
                        <Shield className="w-3 h-3" /> Key saved
                      </span>
                    ) : null}
                  </p>
                </div>
              </div>
              {showAiSection ? (
                <ChevronUp className="w-4 h-4 text-neutral-400 group-hover:text-neutral-600" />
              ) : (
                <ChevronDown className="w-4 h-4 text-neutral-400 group-hover:text-neutral-600" />
              )}
            </button>

            {showAiSection && (
              <div className="mt-4 space-y-4">
                {/* Info banner */}
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100 text-xs text-emerald-800 flex items-start gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">openai/gpt-oss-120b</span> is configured as your active AI tailoring model.
                    It delivers state-of-the-art 117B parameter reasoning and strict ATS keyword alignment.
                  </div>
                </div>

                {/* Model groups */}
                <div className="space-y-3">
                  {Object.entries(groupedModels).map(([provider, models]) => (
                    <div key={provider}>
                      <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-widest mb-1.5">
                        {PROVIDER_LABELS[provider] || provider}
                      </p>
                      <div className="grid grid-cols-1 gap-2">
                        {models.map(model => (
                          <button
                            key={model.id}
                            type="button"
                            id={`ai-model-${model.id.replace(/[^a-zA-Z0-9_-]/g, '-')}`}
                            onClick={() => setSelectedModelId(model.id)}
                            className={`text-left p-3.5 rounded-lg border-2 transition-all cursor-pointer ${
                              selectedModelId === model.id
                                ? 'border-neutral-900 bg-neutral-900 text-white shadow-md'
                                : 'border-neutral-200 hover:border-neutral-400 bg-white'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className={`text-xs font-bold truncate ${selectedModelId === model.id ? 'text-white' : 'text-neutral-900'}`}>
                                    {model.label}
                                  </span>
                                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                    selectedModelId === model.id
                                      ? 'bg-white/20 text-white'
                                      : BADGE_STYLES[model.badge]
                                  }`}>
                                    <Star className="w-2.5 h-2.5 mr-0.5" />
                                    {model.badge}
                                  </span>
                                  {customApiKey && (
                                    <span className={`inline-flex items-center gap-0.5 text-[10px] ${selectedModelId === model.id ? 'text-emerald-300' : 'text-emerald-700 font-medium'}`}>
                                      <Shield className="w-2.5 h-2.5" /> Key set
                                    </span>
                                  )}
                                </div>
                                <p className={`text-[11px] mt-1 leading-relaxed ${selectedModelId === model.id ? 'text-white/80' : 'text-neutral-500'}`}>
                                  {model.description}
                                </p>
                              </div>
                              {selectedModelId === model.id && (
                                <CheckCircle2 className="w-4 h-4 text-white shrink-0 mt-0.5" />
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* API Key Input (Optional) */}
                <div className="space-y-3 p-4 rounded-xl bg-neutral-50 border border-neutral-200">
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-neutral-600" />
                    <span className="text-xs font-semibold text-neutral-800">
                      API Key (Optional)
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1">
                      Custom API Key
                      <span className="text-neutral-400 font-normal ml-1">
                        (Groq, OpenRouter, or OpenAI key — leave empty to use server default)
                      </span>
                    </label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
                      <input
                        id="custom-api-key-input"
                        type={showApiKey ? 'text' : 'password'}
                        value={customApiKey}
                        onChange={e => setCustomApiKey(e.target.value)}
                        placeholder="gsk_... / sk-or-... / sk-... (optional)"
                        className="w-full pl-9 pr-20 py-2 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-3 top-2 text-xs text-neutral-500 hover:text-neutral-800 cursor-pointer font-medium"
                      >
                        {showApiKey ? 'Hide' : 'Show'}
                      </button>
                    </div>
                    <p className="text-[11px] text-neutral-400 mt-1 flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      Stored only in your profile. Never shared or logged by this app.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="pt-3">
            <button
              id="profile-save-btn"
              type="submit"
              disabled={saving}
              className="w-full py-3 px-4 bg-neutral-900 hover:bg-neutral-800 text-white font-medium rounded-lg transition-colors shadow-xs disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {saving ? 'Saving Profile...' : isEditing ? 'Save Changes' : 'Continue to Dashboard'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

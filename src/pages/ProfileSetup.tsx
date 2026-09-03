import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { userService } from '../services/userService';
import { User, Mail, Phone, Globe, MapPin, Briefcase, FileText, Upload, CheckCircle2, AlertCircle, Loader2, Sparkles } from 'lucide-react';

const COUNTRIES = ['India', 'USA', 'UK', 'Canada', 'Australia', 'Germany', 'Singapore', 'UAE'];

const POPULAR_LOCATIONS: Record<string, string[]> = {
  India: ['Hyderabad', 'Bangalore', 'Mumbai', 'Chennai', 'Delhi NCR', 'Pune'],
  USA: ['San Francisco', 'New York', 'Seattle', 'Austin', 'Boston', 'Chicago'],
  UK: ['London', 'Manchester', 'Birmingham', 'Edinburgh', 'Cambridge'],
  Canada: ['Toronto', 'Vancouver', 'Montreal', 'Ottawa', 'Calgary'],
  Australia: ['Sydney', 'Melbourne', 'Brisbane', 'Perth'],
  Germany: ['Berlin', 'Munich', 'Frankfurt', 'Hamburg'],
  Singapore: ['Singapore'],
  UAE: ['Dubai', 'Abu Dhabi'],
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
  const [country, setCountry] = useState(profile?.country || 'India');
  const [location, setLocation] = useState(profile?.location || 'Hyderabad');
  const [jobRole, setJobRole] = useState(profile?.jobRole || 'React Developer');
  const [baseResumeText, setBaseResumeText] = useState(
    profile?.baseResumeText ||
      `JOHN DOE
Email: ${user?.email || 'john@example.com'} | Phone: +1 234 567 890 | LinkedIn: linkedin.com/in/johndoe

PROFESSIONAL SUMMARY
Experienced Software Engineer with 4+ years specializing in modern front-end architectures, React, TypeScript, responsive UI development, and scalable cloud application integrations. Proven track record in improving page load speeds, refactoring legacy codebases, and collaborating in agile teams.

CORE SKILLS
- Languages & Frameworks: React, TypeScript, JavaScript (ES6+), HTML5, CSS3, Tailwind CSS, Next.js, Node.js
- State & APIs: Redux Toolkit, React Query, RESTful APIs, GraphQL
- Tools & Practices: Git, Vite, Webpack, Jest, Cypress, CI/CD, Agile/Scrum

PROFESSIONAL EXPERIENCE
Frontend Software Engineer | TechCorp Global (2022 – Present)
- Developed and maintained responsive SaaS client dashboards using React, TypeScript, and Tailwind CSS, increasing user session durations by 22%.
- Engineered reusable UI component systems adopted across 4 distributed engineering teams.
- Optimized bundle size and eliminated blocking render passes, cutting time-to-interactive by 35%.
- Integrated RESTful backend microservices and handled offline data caching strategies.

Software Developer | Innovate Soft (2020 – 2022)
- Collaborated with UX designers to deliver pixel-perfect client portals serving 50,000+ monthly active users.
- Built interactive data visualization panels using React and charting libraries.
- Wrote end-to-end integration tests using Cypress, reducing production bugs by 18%.

EDUCATION
Bachelor of Technology in Computer Science & Engineering
State University, Graduated 2020`
  );
  const [resumeFileName, setResumeFileName] = useState(profile?.baseResumeFileName || 'base_resume.txt');
  const [saving, setSaving] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractedNotice, setExtractedNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileFeedback, setFileFeedback] = useState<string | null>(null);

  // Suggested locations based on country
  const locationSuggestions = POPULAR_LOCATIONS[country] || ['Remote', 'Capital City'];

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
        // Read file as ArrayBuffer and convert to base64
        const arrayBuffer = await file.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        base64Data = btoa(binary);
      }

      // Call extraction API
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

      if (!res.ok) {
        throw new Error(`Resume extraction failed with status ${res.status}`);
      }

      const result = await res.json();
      if (result?.data) {
        const extracted = result.data;
        if (extracted.name && extracted.name.trim()) {
          setName(extracted.name.trim());
        }
        if (extracted.phone && extracted.phone.trim()) {
          setPhone(extracted.phone.trim());
        }
        if (extracted.location && extracted.location.trim()) {
          setLocation(extracted.location.trim());
        }
        if (extracted.country && COUNTRIES.includes(extracted.country)) {
          setCountry(extracted.country);
        }
        if (extracted.jobRole && extracted.jobRole.trim()) {
          setJobRole(extracted.jobRole.trim());
        }
        if (extracted.baseResumeText && extracted.baseResumeText.trim()) {
          setBaseResumeText(extracted.baseResumeText.trim());
        }

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
        try {
          const txt = await file.text();
          setBaseResumeText(txt);
        } catch {}
      }
      setFileFeedback(
        `Uploaded "${file.name}". You can inspect or tweak the extracted textual profile below for ATS tailoring.`
      );
    } finally {
      setExtracting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!name.trim()) {
      setError('Please provide your full name.');
      return;
    }
    if (!phone.trim()) {
      setError('Please provide your phone number.');
      return;
    }
    if (!location.trim()) {
      setError('Please select or enter your location city.');
      return;
    }
    if (!jobRole.trim()) {
      setError('Please specify your target job role.');
      return;
    }
    if (!baseResumeText.trim()) {
      setError('Please upload or provide your base resume details.');
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
      });

      await refreshProfile();
      onCompleted();
    } catch (err: any) {
      console.error('Save profile error:', err);
      setError(err?.message || 'Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 sm:px-6">
      <div className="bg-white border border-neutral-200 rounded-xl shadow-sm p-6 sm:p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">
            {isEditing ? 'Profile Settings' : 'Complete Your Profile'}
          </h1>
          <p className="text-sm text-neutral-600 mt-1">
            Configure your personal information, preferred job location, and base resume. Location
            matches will prioritize jobs in your city and country.
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
            <h2 className="text-sm font-semibold text-neutral-900 uppercase tracking-wider">
              Personal Information
            </h2>

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
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Email (From Google)
                </label>
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
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                <input
                  id="profile-phone-input"
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="9876543210"
                  required
                  className="w-full pl-9 pr-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-neutral-100 pt-5 space-y-4">
            <h2 className="text-sm font-semibold text-neutral-900 uppercase tracking-wider">
              Job Preferences & Location
            </h2>

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
                      if (defaults && defaults.length > 0) {
                        setLocation(defaults[0]);
                      }
                    }}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                  >
                    {COUNTRIES.map(c => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Location (City)
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                  <input
                    id="profile-location-input"
                    type="text"
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    placeholder="e.g. Hyderabad"
                    required
                    className="w-full pl-9 pr-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                  />
                </div>
                {/* Popular suggestions */}
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
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Target Job Role
              </label>
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

          <div className="border-t border-neutral-100 pt-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-neutral-900 uppercase tracking-wider">
                Base Resume
              </h2>
              <span className="text-xs text-neutral-500">
                Kept intact as your source of truth
              </span>
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
                placeholder="Paste or review your resume text here..."
                className="w-full p-3 font-mono text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent leading-relaxed"
              />
              <p className="text-xs text-neutral-500 mt-1">
                The AI will use only the authentic facts, companies, and skills present in this base resume.
              </p>
            </div>
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

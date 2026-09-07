export type UserRole = 'admin' | 'user';

export type JobSource =
  | 'Arbeitnow'
  | 'Remotive'
  | 'Jobicy'
  | 'LinkedIn'
  | 'Indeed'
  | 'Glassdoor'
  | 'Company Portal';

export interface UserPermissions {
  resumeBuilder: boolean;
  jobs: boolean;
  applications: boolean;
}

export interface AuthorizedUser {
  id: string;
  email: string;
  phone: string;
  status: 'active' | 'disabled';
  permissions?: UserPermissions;
  addedAt: string;
  addedBy?: string;
}

export interface UserProfile {
  id: string; // firebase user uid
  email: string;
  name: string;
  phone: string;
  country: string;
  location: string;
  jobRole: string;
  baseResumeText?: string;
  baseResumeFileName?: string;
  baseResumeUrl?: string;
  // AI Model preferences
  aiModel?: string;           // e.g. 'gemini-2.0-flash', 'gpt-4o', 'claude-3-5-sonnet'
  customApiKey?: string;      // User's own API key for custom model
  customModelName?: string;   // Custom model identifier if not in list
  customModelProvider?: 'google' | 'openai' | 'anthropic' | 'mistral' | 'other';
  createdAt: string;
  updatedAt: string;
}

export interface Job {
  id: string;
  company: string;
  title: string;
  country: string;
  location: string;
  description: string;
  applicationUrl: string;
  employmentType: string;
  experienceLevel: string;
  source?: JobSource | string;
  salary?: string;
  postedAt: string; // ISO string or relative time
  createdAt: string;
  updatedAt: string;
}

export type ApplicationStatus =
  | 'draft'
  | 'saved'
  | 'applied'
  | 'interviewing'
  | 'offer'
  | 'rejected';

export interface JobApplication {
  id: string;
  userId: string;
  jobId: string;
  company: string;
  jobTitle: string;
  tailoredResumeMarkdown?: string;
  tailoredResumeUrl?: string;
  status: ApplicationStatus;
  createdAt: string;
  appliedAt?: string | null;
}

export interface ResumeBuilderHistoryItem {
  id: string;
  userId: string;
  companyName: string;
  jobTitle?: string;
  jobDescription: string;
  originalResume: string;
  tailoredResumeMarkdown: string;
  updatedExperienceMarkdown?: string;
  updatedProjectsMarkdown?: string;
  modelUsed?: string;
  createdAt: string;
  updatedAt: string;
}



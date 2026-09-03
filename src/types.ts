export type UserRole = 'admin' | 'user';

export type JobSource = 'Indeed' | 'LinkedIn' | 'Glassdoor' | 'Company Portal';

export interface AuthorizedUser {
  id: string;
  email: string;
  phone: string;
  status: 'active' | 'disabled';
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

export interface JobApplication {
  id: string;
  userId: string;
  jobId: string;
  company: string;
  jobTitle: string;
  tailoredResumeMarkdown?: string;
  tailoredResumeUrl?: string;
  status: 'draft' | 'applied';
  createdAt: string;
  appliedAt?: string | null;
}

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Job, JobSource } from '../types';

const LOCAL_JOBS_CACHE_KEY = 'portal_live_internet_active_jobs';
const LEGACY_CACHE_KEY = 'portal_internet_active_jobs';

// Static mock IDs to purge if found in browser storage
const STATIC_MOCK_IDS = new Set([
  'job-linkedin-google-01',
  'job-indeed-amazon-02',
  'job-company-microsoft-03',
  'job-glassdoor-stripe-04',
  'job-linkedin-meta-05',
  'job-indeed-deloitte-06',
  'job-glassdoor-atlassian-07',
  'job-portal-uber-08',
  'job-linkedin-apple-09',
  'job-portal-shopify-10',
]);

function isStaticMockJob(job: Job): boolean {
  if (!job || !job.id) return true;
  if (STATIC_MOCK_IDS.has(job.id)) return true;
  if (job.id.startsWith('job-linkedin-') || job.id.startsWith('job-indeed-') || job.id.startsWith('job-company-') || job.id.startsWith('job-glassdoor-') || job.id.startsWith('job-portal-')) {
    return true;
  }
  return false;
}

function purgeLegacyMockStorage() {
  try {
    localStorage.removeItem(LEGACY_CACHE_KEY);
    const cached = localStorage.getItem(LOCAL_JOBS_CACHE_KEY);
    if (cached) {
      const parsed: Job[] = JSON.parse(cached);
      const cleaned = parsed.filter(j => !isStaticMockJob(j));
      localStorage.setItem(LOCAL_JOBS_CACHE_KEY, JSON.stringify(cleaned));
    }
  } catch (e) {
    // Ignore storage warnings
  }
}

// Automatically purge static mocks on module load
purgeLegacyMockStorage();

export const jobService = {
  /**
   * Purges any residual mock/static postings from local browser storage
   */
  purgeStaticJobs(): void {
    purgeLegacyMockStorage();
  },

  /**
   * Retrieves all verified live jobs from cache and Firestore
   */
  async getAllJobs(): Promise<Job[]> {
    let list: Job[] = [];

    try {
      const cached = localStorage.getItem(LOCAL_JOBS_CACHE_KEY);
      if (cached) {
        const parsed: Job[] = JSON.parse(cached);
        list = parsed.filter(j => !isStaticMockJob(j));
      }
    } catch (e) {
      console.warn('Failed reading live jobs cache:', e);
    }

    // Try synchronizing with Firestore if online
    try {
      const q = query(collection(db, 'jobs'), orderBy('postedAt', 'desc'));
      const snap = await getDocs(q);
      const fsJobs = snap.docs
        .map(d => ({
          id: d.id,
          ...(d.data() as Omit<Job, 'id'>),
        }))
        .filter(j => !isStaticMockJob(j));

      if (fsJobs.length > 0) {
        const existingIds = new Set(list.map(j => j.id));
        for (const fj of fsJobs) {
          if (!existingIds.has(fj.id)) {
            list.push(fj);
          }
        }
      }
    } catch (error) {
      // Offline or Firestore permission handled gracefully
    }

    // If cache is empty, immediately trigger live internet search
    if (list.length === 0) {
      return this.searchInternetJobs({});
    }

    return list;
  },

  async getJobById(jobId: string): Promise<Job | null> {
    const list = await this.getAllJobs();
    const found = list.find(j => j.id === jobId);
    if (found) return found;

    try {
      const snap = await getDoc(doc(db, 'jobs', jobId));
      if (snap.exists()) {
        const data = { id: snap.id, ...(snap.data() as Omit<Job, 'id'>) };
        if (!isStaticMockJob(data)) {
          return data;
        }
      }
    } catch (error) {
      console.warn('Failed to get job from Firestore:', error);
    }

    return null;
  },

  /**
   * Real-time Internet Jobs Search across Arbeitnow, Remotive, Jobicy, and Live Aggregators
   */
  async searchInternetJobs(params: {
    query?: string;
    location?: string;
    country?: string;
    source?: string;
  }): Promise<Job[]> {
    try {
      const res = await fetch('/api/jobs/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (res.ok) {
        const data = await res.json();
        if (data?.jobs && Array.isArray(data.jobs) && data.jobs.length > 0) {
          const now = new Date().toISOString();
          const liveOnly: Job[] = data.jobs
            .filter((item: any) => !STATIC_MOCK_IDS.has(item.id))
            .map((item: any, idx: number) => ({
              id: item.id || `live-job-${Date.now()}-${idx}`,
              company: item.company || 'Tech Company',
              title: item.title || 'Software Engineer',
              location: item.location || params.location || 'Remote',
              country: item.country || params.country || 'Global',
              employmentType: item.employmentType || 'Full-time',
              experienceLevel: item.experienceLevel || 'Mid-Senior',
              source: item.source || 'Arbeitnow',
              applicationUrl: item.applicationUrl || 'https://www.google.com/search?q=jobs',
              salary: item.salary || 'Competitive Market Rate',
              postedAt: item.postedAt || now,
              description: item.description || 'Active live internet job listing.',
              createdAt: item.createdAt || now,
              updatedAt: item.updatedAt || now,
            }));

          // Cache verified live internet jobs
          try {
            localStorage.setItem(LOCAL_JOBS_CACHE_KEY, JSON.stringify(liveOnly));
          } catch (e) {}

          return liveOnly;
        }
      }
    } catch (err) {
      console.warn('Real-time internet job search endpoint notice:', err);
    }

    // Try GET /api/jobs/live fallback
    try {
      const liveRes = await fetch('/api/jobs/live');
      if (liveRes.ok) {
        const liveData = await liveRes.json();
        if (liveData?.jobs && Array.isArray(liveData.jobs) && liveData.jobs.length > 0) {
          const liveOnly = liveData.jobs.filter((j: any) => !isStaticMockJob(j));
          try {
            localStorage.setItem(LOCAL_JOBS_CACHE_KEY, JSON.stringify(liveOnly));
          } catch (e) {}
          return liveOnly;
        }
      }
    } catch (e) {}

    return [];
  },

  /**
   * Fetches the latest live jobs with zero static fallback
   */
  async fetchLatestLiveJobs(params: {
    query?: string;
    location?: string;
    country?: string;
    source?: string;
  } = {}): Promise<Job[]> {
    return this.searchInternetJobs(params);
  },
};

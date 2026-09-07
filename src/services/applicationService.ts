import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { ApplicationStatus, JobApplication } from '../types';
import { handleFirestoreError, OperationType } from '../firebase/errorHandler';

export const applicationService = {
  async getApplicationsByUser(userId: string): Promise<JobApplication[]> {
    try {
      const q = query(
        collection(db, 'applications'),
        where('userId', '==', userId)
      );
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({
        id: d.id,
        ...(d.data() as Omit<JobApplication, 'id'>),
      }));
      // Sort client-side by createdAt desc
      return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'applications');
      return [];
    }
  },

  async getApplicationById(applicationId: string): Promise<JobApplication | null> {
    const path = `applications/${applicationId}`;
    try {
      const snap = await getDoc(doc(db, 'applications', applicationId));
      if (!snap.exists()) return null;
      return { id: snap.id, ...(snap.data() as Omit<JobApplication, 'id'>) };
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return null;
    }
  },

  async findExistingApplication(userId: string, jobId: string): Promise<JobApplication | null> {
    try {
      const q = query(
        collection(db, 'applications'),
        where('userId', '==', userId),
        where('jobId', '==', jobId)
      );
      const snap = await getDocs(q);
      if (snap.empty) return null;
      const first = snap.docs[0];
      return { id: first.id, ...(first.data() as Omit<JobApplication, 'id'>) };
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'applications');
      return null;
    }
  },

  async saveApplication(
    data: Omit<JobApplication, 'id' | 'createdAt'> & { id?: string }
  ): Promise<string> {
    const appId = data.id || doc(collection(db, 'applications')).id;
    const now = new Date().toISOString();
    const path = `applications/${appId}`;

    try {
      await setDoc(
        doc(db, 'applications', appId),
        {
          userId: data.userId,
          jobId: data.jobId,
          company: data.company,
          jobTitle: data.jobTitle,
          tailoredResumeMarkdown: data.tailoredResumeMarkdown || '',
          tailoredResumeUrl: data.tailoredResumeUrl || '',
          status: data.status,
          createdAt: now,
          appliedAt:
            data.status === 'applied' || data.status === 'interviewing' || data.status === 'offer'
              ? data.appliedAt || now
              : null,
        },
        { merge: true }
      );
      return appId;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
      return '';
    }
  },

  async updateApplicationStatus(
    applicationId: string,
    status: ApplicationStatus
  ): Promise<void> {
    const path = `applications/${applicationId}`;
    const updates: Partial<JobApplication> = {
      status,
      appliedAt:
        status === 'applied' || status === 'interviewing' || status === 'offer'
          ? new Date().toISOString()
          : null,
    };
    try {
      await updateDoc(doc(db, 'applications', applicationId), updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async bookmarkOrSaveJob(
    userId: string,
    job: { id: string; company: string; title: string },
    status: ApplicationStatus = 'saved'
  ): Promise<string> {
    const existing = await this.findExistingApplication(userId, job.id);
    if (existing) {
      await this.updateApplicationStatus(existing.id, status);
      return existing.id;
    }
    return this.saveApplication({
      userId,
      jobId: job.id,
      company: job.company,
      jobTitle: job.title,
      status,
      tailoredResumeMarkdown: '',
      appliedAt:
        status === 'applied' || status === 'interviewing' || status === 'offer'
          ? new Date().toISOString()
          : null,
    });
  },

  async deleteApplication(applicationId: string): Promise<void> {
    const path = `applications/${applicationId}`;
    try {
      await deleteDoc(doc(db, 'applications', applicationId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },
};


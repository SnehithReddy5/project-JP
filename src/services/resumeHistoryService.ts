import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { ResumeBuilderHistoryItem } from '../types';
import { handleFirestoreError, OperationType } from '../firebase/errorHandler';

const getLocalStorageKey = (userId: string) => `resume_builder_history_${userId}`;

export const resumeHistoryService = {
  // Retrieve local cache for a user
  getLocalHistory(userId: string): ResumeBuilderHistoryItem[] {
    try {
      const cached = localStorage.getItem(getLocalStorageKey(userId));
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  },

  // Save list to local cache
  setLocalHistory(userId: string, items: ResumeBuilderHistoryItem[]): void {
    try {
      localStorage.setItem(getLocalStorageKey(userId), JSON.stringify(items));
    } catch (e) {
      console.warn('Failed to save resume history to localStorage:', e);
    }
  },

  // Get all history items for a user (Firestore with local fallback)
  async getResumeHistoryByUser(userId: string): Promise<ResumeBuilderHistoryItem[]> {
    const localItems = this.getLocalHistory(userId);
    try {
      const q = query(
        collection(db, 'resumeBuilderHistory'),
        where('userId', '==', userId)
      );
      const snap = await getDocs(q);
      const remoteItems = snap.docs.map(d => ({
        id: d.id,
        ...(d.data() as Omit<ResumeBuilderHistoryItem, 'id'>),
      }));

      // Merge and sort newest first
      const map = new Map<string, ResumeBuilderHistoryItem>();
      remoteItems.forEach(item => map.set(item.id, item));
      localItems.forEach(item => {
        if (!map.has(item.id)) map.set(item.id, item);
      });

      const merged = Array.from(map.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      this.setLocalHistory(userId, merged);
      return merged;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'resumeBuilderHistory');
      return localItems.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }
  },

  // Save a new tailored resume record
  async saveResumeHistory(
    item: Omit<ResumeBuilderHistoryItem, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<ResumeBuilderHistoryItem> {
    const now = new Date().toISOString();
    const id = `res_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const fullItem: ResumeBuilderHistoryItem = {
      ...item,
      id,
      createdAt: now,
      updatedAt: now,
    };

    // Update local cache immediately
    const existing = this.getLocalHistory(item.userId);
    this.setLocalHistory(item.userId, [fullItem, ...existing]);

    try {
      await setDoc(doc(db, 'resumeBuilderHistory', id), fullItem);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `resumeBuilderHistory/${id}`);
    }

    return fullItem;
  },

  // Update an existing record
  async updateResumeHistory(
    id: string,
    updates: Partial<ResumeBuilderHistoryItem>,
    userId?: string
  ): Promise<void> {
    const now = new Date().toISOString();

    if (userId) {
      const local = this.getLocalHistory(userId);
      const updated = local.map(i => (i.id === id ? { ...i, ...updates, updatedAt: now } : i));
      this.setLocalHistory(userId, updated);
    }

    try {
      await updateDoc(doc(db, 'resumeBuilderHistory', id), {
        ...updates,
        updatedAt: now,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `resumeBuilderHistory/${id}`);
    }
  },

  // Delete a history item
  async deleteResumeHistory(id: string, userId?: string): Promise<void> {
    if (userId) {
      const local = this.getLocalHistory(userId);
      this.setLocalHistory(
        userId,
        local.filter(i => i.id !== id)
      );
    }

    try {
      await deleteDoc(doc(db, 'resumeBuilderHistory', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `resumeBuilderHistory/${id}`);
    }
  },
};

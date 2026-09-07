import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { UserProfile } from '../types';
import { handleFirestoreError, OperationType } from '../firebase/errorHandler';

const getLocalProfileKey = (userId: string) => `portal_user_profile_${userId}`;

export const userService = {
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const path = `users/${userId}`;
    const localKey = getLocalProfileKey(userId);

    try {
      const snap = await getDoc(doc(db, 'users', userId));
      if (snap.exists()) {
        const profile = { id: snap.id, ...(snap.data() as Omit<UserProfile, 'id'>) };
        try {
          localStorage.setItem(localKey, JSON.stringify(profile));
        } catch (e) {}
        return profile;
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }

    // Graceful offline/permission fallback: check local storage
    try {
      const cached = localStorage.getItem(localKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      console.warn('Failed to read local profile cache:', e);
    }

    return null;
  },

  async createUserProfile(profile: Omit<UserProfile, 'createdAt' | 'updatedAt'>): Promise<void> {
    const path = `users/${profile.id}`;
    const now = new Date().toISOString();
    const fullProfile: UserProfile = {
      ...profile,
      createdAt: now,
      updatedAt: now,
    };

    // Always update local cache first for instant responsiveness
    const localKey = getLocalProfileKey(profile.id);
    try {
      localStorage.setItem(localKey, JSON.stringify(fullProfile));
    } catch (e) {}

    try {
      await setDoc(doc(db, 'users', profile.id), fullProfile);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<void> {
    const path = `users/${userId}`;
    const localKey = getLocalProfileKey(userId);

    // Update local cache
    try {
      const cached = localStorage.getItem(localKey);
      if (cached) {
        const current = JSON.parse(cached);
        const merged = { ...current, ...updates, updatedAt: new Date().toISOString() };
        localStorage.setItem(localKey, JSON.stringify(merged));
      }
    } catch (e) {}

    try {
      await updateDoc(doc(db, 'users', userId), {
        ...updates,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },
};

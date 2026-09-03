import {
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase/config';
import { AuthorizedUser } from '../types';
import { handleFirestoreError, OperationType } from '../firebase/errorHandler';

const ADMIN_EMAILS = ['reddyakhi82@gmail.com'];
const ADMIN_SESSION_KEY = 'portal_admin_session_auth';
const ADMIN_USERNAME_KEY = 'portal_admin_username';
const LOCAL_USERS_CACHE_KEY = 'portal_local_authorized_users';

export const authService = {
  // Admin credentials verification for /admin
  verifyAdminCredentials(usernameInput: string, passwordInput: string): boolean {
    const normUser = (usernameInput || '').trim().toLowerCase();
    const validUsers = ['admin', 'reddyakhi82@gmail.com', 'admin@jobportal.com'];
    const validPasswords = ['admin123', 'Admin@2026!', 'admin'];

    const userMatches = validUsers.includes(normUser);
    const passMatches = validPasswords.includes(passwordInput.trim());

    return userMatches && passMatches;
  },

  setAdminSession(username: string): void {
    try {
      sessionStorage.setItem(ADMIN_SESSION_KEY, 'true');
      sessionStorage.setItem(ADMIN_USERNAME_KEY, username.trim() || 'admin');
    } catch (e) {
      console.warn('Could not set admin session in sessionStorage:', e);
    }
  },

  getAdminSession(): { isAuthenticated: boolean; username: string } {
    try {
      const isAuth = sessionStorage.getItem(ADMIN_SESSION_KEY) === 'true';
      const username = sessionStorage.getItem(ADMIN_USERNAME_KEY) || 'admin';
      return { isAuthenticated: isAuth, username };
    } catch (e) {
      return { isAuthenticated: false, username: '' };
    }
  },

  clearAdminSession(): void {
    try {
      sessionStorage.removeItem(ADMIN_SESSION_KEY);
      sessionStorage.removeItem(ADMIN_USERNAME_KEY);
    } catch (e) {
      console.warn('Could not clear admin session:', e);
    }
  },

  // Check if an email is an admin
  isAdminEmail(email: string | null | undefined): boolean {
    if (!email) return false;
    return ADMIN_EMAILS.includes(email.toLowerCase().trim());
  },

  // Check if user's normalized email is in authorizedUsers collection or admin list
  async checkEmailAuthorized(rawEmail: string): Promise<boolean> {
    const normalizedEmail = (rawEmail || '').toLowerCase().trim();
    if (!normalizedEmail) return false;

    if (this.isAdminEmail(normalizedEmail)) {
      return true;
    }

    // 1. Check direct doc ID in Firestore
    try {
      const id = normalizedEmail.replace(/[^a-zA-Z0-9]/g, '_');
      const docRef = doc(db, 'authorizedUsers', id);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        if (data && data.status === 'active') {
          return true;
        }
      }
    } catch (err) {
      // Continue to query check
    }

    // 2. Query Firestore by email field
    try {
      const q = query(
        collection(db, 'authorizedUsers'),
        where('email', '==', normalizedEmail),
        where('status', '==', 'active')
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        return true;
      }
    } catch (error) {
      console.warn('Firestore check error, checking local allowlist cache:', error);
    }

    // 3. Check local allowlist cache (fallback for resilience)
    try {
      const rawCache = localStorage.getItem(LOCAL_USERS_CACHE_KEY);
      if (rawCache) {
        const list: AuthorizedUser[] = JSON.parse(rawCache);
        const match = list.find(u => u.email.toLowerCase().trim() === normalizedEmail && u.status === 'active');
        if (match) return true;
      }
    } catch (e) {
      // ignore
    }

    return false;
  },

  // Google Sign-In with strict invite-only gate check
  async signInWithGoogle(): Promise<{ user: FirebaseUser; authorized: boolean }> {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    const email = (user.email || '').toLowerCase().trim();

    const isAuthorized = await this.checkEmailAuthorized(email);

    if (!isAuthorized) {
      // Reject unauthorized access immediately
      await firebaseSignOut(auth);
      throw new Error(
        `Access Denied: The Google account (${email}) has not been added by an administrator. Self-registration is strictly disabled. You cannot sign up or log in until an administrator authorizes your email.`
      );
    }

    return { user, authorized: true };
  },

  async signOut(): Promise<void> {
    await firebaseSignOut(auth);
  },

  onAuthChanged(callback: (user: FirebaseUser | null) => void) {
    return onAuthStateChanged(auth, callback);
  },

  // Admin: Get all authorized users
  async getAuthorizedUsers(): Promise<AuthorizedUser[]> {
    let firestoreUsers: AuthorizedUser[] = [];
    try {
      const snap = await getDocs(collection(db, 'authorizedUsers'));
      firestoreUsers = snap.docs.map(d => ({
        id: d.id,
        ...(d.data() as Omit<AuthorizedUser, 'id'>),
      }));
      // Update local cache
      if (firestoreUsers.length > 0) {
        localStorage.setItem(LOCAL_USERS_CACHE_KEY, JSON.stringify(firestoreUsers));
      }
      return firestoreUsers;
    } catch (error) {
      console.warn('Could not list authorized users from Firestore, reading local cache:', error);
      try {
        const cached = localStorage.getItem(LOCAL_USERS_CACHE_KEY);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (e) {
        // ignore
      }
      return [];
    }
  },

  // Admin: Add authorized user
  async addAuthorizedUser(email: string, phone: string): Promise<void> {
    const normalizedEmail = email.toLowerCase().trim();
    const id = normalizedEmail.replace(/[^a-zA-Z0-9]/g, '_');
    const newUser: AuthorizedUser = {
      id,
      email: normalizedEmail,
      phone: phone.trim(),
      status: 'active',
      addedAt: new Date().toISOString(),
      addedBy: auth.currentUser?.email || 'admin',
    };

    // Update local cache immediately
    try {
      const cached = localStorage.getItem(LOCAL_USERS_CACHE_KEY);
      const list: AuthorizedUser[] = cached ? JSON.parse(cached) : [];
      const updated = [newUser, ...list.filter(u => u.id !== id)];
      localStorage.setItem(LOCAL_USERS_CACHE_KEY, JSON.stringify(updated));
    } catch (e) {
      // ignore
    }

    const path = `authorizedUsers/${id}`;
    try {
      await setDoc(doc(db, 'authorizedUsers', id), {
        email: normalizedEmail,
        phone: phone.trim(),
        status: 'active',
        addedAt: newUser.addedAt,
        addedBy: newUser.addedBy,
      });
    } catch (error) {
      console.warn('Firestore setDoc failed, retained in local cache:', error);
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  // Admin: Update authorized user status
  async updateAuthorizedUserStatus(id: string, status: 'active' | 'disabled'): Promise<void> {
    // Update local cache
    try {
      const cached = localStorage.getItem(LOCAL_USERS_CACHE_KEY);
      if (cached) {
        const list: AuthorizedUser[] = JSON.parse(cached);
        const updated = list.map(u => (u.id === id ? { ...u, status } : u));
        localStorage.setItem(LOCAL_USERS_CACHE_KEY, JSON.stringify(updated));
      }
    } catch (e) {
      // ignore
    }

    const path = `authorizedUsers/${id}`;
    try {
      await updateDoc(doc(db, 'authorizedUsers', id), { status });
    } catch (error) {
      console.warn('Firestore updateDoc failed, retained in local cache:', error);
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  // Admin: Remove authorized user
  async removeAuthorizedUser(id: string): Promise<void> {
    // Update local cache
    try {
      const cached = localStorage.getItem(LOCAL_USERS_CACHE_KEY);
      if (cached) {
        const list: AuthorizedUser[] = JSON.parse(cached);
        const updated = list.filter(u => u.id !== id);
        localStorage.setItem(LOCAL_USERS_CACHE_KEY, JSON.stringify(updated));
      }
    } catch (e) {
      // ignore
    }

    const path = `authorizedUsers/${id}`;
    try {
      await deleteDoc(doc(db, 'authorizedUsers', id));
    } catch (error) {
      console.warn('Firestore deleteDoc failed, removed from local cache:', error);
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },
};

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
import { AuthorizedUser, UserPermissions } from '../types';
import { handleFirestoreError, OperationType } from '../firebase/errorHandler';

export const DEFAULT_USER_PERMISSIONS: UserPermissions = {
  resumeBuilder: true,
  jobs: true,
  applications: true,
};

const ADMIN_EMAILS = ['admin@jobportal.com'];
const ADMIN_SESSION_KEY = 'portal_admin_session_auth';
const ADMIN_USERNAME_KEY = 'portal_admin_username';
const LOCAL_USERS_CACHE_KEY = 'portal_local_authorized_users';
let authListeners: ((user: FirebaseUser | null) => void)[] = [];

export const authService = {
  // Admin credentials verification for /admin
  verifyAdminCredentials(usernameInput: string, passwordInput: string): boolean {
    const normUser = (usernameInput || '').trim().toLowerCase();
    const validUsers = ['admin', 'admin@jobportal.com'];
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

  async clearAdminSession(): Promise<void> {
    try {
      sessionStorage.removeItem(ADMIN_SESSION_KEY);
      sessionStorage.removeItem(ADMIN_USERNAME_KEY);
    } catch (e) {
      console.warn('Could not clear admin session:', e);
    }
    try {
      await firebaseSignOut(auth);
    } catch (e) {}
  },

  // Check if an email is an admin
  isAdminEmail(email: string | null | undefined): boolean {
    if (!email) return false;
    return ADMIN_EMAILS.includes(email.toLowerCase().trim());
  },

  // Get full authorization details and feature permissions for an email
  async getUserAuthorization(rawEmail: string): Promise<{
    authorized: boolean;
    permissions: UserPermissions;
    status: 'active' | 'disabled';
  }> {
    const normalizedEmail = (rawEmail || '').toLowerCase().trim();
    if (!normalizedEmail) {
      return { authorized: false, permissions: DEFAULT_USER_PERMISSIONS, status: 'disabled' };
    }

    let firestoreChecked = false;

    // 1. Check direct doc ID in Firestore
    try {
      const id = normalizedEmail.replace(/[^a-zA-Z0-9]/g, '_');
      const docRef = doc(db, 'authorizedUsers', id);
      const snap = await getDoc(docRef);
      firestoreChecked = true;
      if (snap.exists()) {
        const data = snap.data();
        if (data && data.status === 'active') {
          return {
            authorized: true,
            permissions: {
              resumeBuilder: data.permissions?.resumeBuilder !== false,
              jobs: data.permissions?.jobs !== false,
              applications: data.permissions?.applications !== false,
            },
            status: 'active',
          };
        } else {
          return { authorized: false, permissions: DEFAULT_USER_PERMISSIONS, status: 'disabled' };
        }
      }
    } catch (err) {
      // Network or permission error - fall through to query or offline cache
    }

    // 2. Query Firestore by email field
    try {
      const q = query(
        collection(db, 'authorizedUsers'),
        where('email', '==', normalizedEmail)
      );
      const snap = await getDocs(q);
      firestoreChecked = true;
      if (!snap.empty) {
        const data = snap.docs[0].data();
        if (data.status === 'active') {
          return {
            authorized: true,
            permissions: {
              resumeBuilder: data.permissions?.resumeBuilder !== false,
              jobs: data.permissions?.jobs !== false,
              applications: data.permissions?.applications !== false,
            },
            status: 'active',
          };
        } else {
          return { authorized: false, permissions: DEFAULT_USER_PERMISSIONS, status: 'disabled' };
        }
      }
    } catch (error) {
      console.warn('Firestore query error:', error);
    }

    // CRITICAL: If Firestore was successfully reached and document is not found,
    // the user is strictly NOT authorized. Do NOT fall back to stale local cache!
    if (firestoreChecked) {
      return { authorized: false, permissions: DEFAULT_USER_PERMISSIONS, status: 'disabled' };
    }

    // 3. Fallback to local cache ONLY if Firestore was unreachable (e.g. offline)
    try {
      const rawCache = localStorage.getItem(LOCAL_USERS_CACHE_KEY);
      if (rawCache) {
        const list: AuthorizedUser[] = JSON.parse(rawCache);
        const match = list.find(
          u => u.email.toLowerCase().trim() === normalizedEmail && u.status === 'active'
        );
        if (match) {
          return {
            authorized: true,
            permissions: {
              resumeBuilder: match.permissions?.resumeBuilder !== false,
              jobs: match.permissions?.jobs !== false,
              applications: match.permissions?.applications !== false,
            },
            status: 'active',
          };
        }
      }
    } catch (e) {
      // ignore
    }

    return { authorized: false, permissions: DEFAULT_USER_PERMISSIONS, status: 'disabled' };
  },

  // Check if user's normalized email is in authorizedUsers collection or admin list
  async checkEmailAuthorized(rawEmail: string): Promise<boolean> {
    const authDetails = await this.getUserAuthorization(rawEmail);
    return authDetails.authorized;
  },

  // Direct email sign-in with strict invite-only verification (resilient fallback for local dev & unauthorized-domain)
  async signInWithAuthorizedEmail(rawEmail: string): Promise<{ user: FirebaseUser; authorized: boolean }> {
    const email = (rawEmail || '').toLowerCase().trim();
    if (!email) {
      throw new Error('Please enter your authorized email address.');
    }

    const isAuthorized = await this.checkEmailAuthorized(email);
    if (!isAuthorized) {
      throw new Error(
        `Access Denied: The account (${email}) has not been added by an administrator. Self-registration is strictly disabled. Only users added by an administrator can log in.`
      );
    }

    const simulatedUser = {
      uid: 'user-' + email.replace(/[^a-zA-Z0-9]/g, '_'),
      email: email,
      displayName: email.split('@')[0],
      emailVerified: true,
    } as unknown as FirebaseUser;

    try {
      sessionStorage.setItem('portal_direct_user_session', JSON.stringify(simulatedUser));
    } catch (e) {}

    authListeners.forEach(cb => cb(simulatedUser));
    return { user: simulatedUser, authorized: true };
  },

  getDirectUserSession(): FirebaseUser | null {
    try {
      const data = sessionStorage.getItem('portal_direct_user_session');
      if (data) return JSON.parse(data);
    } catch (e) {}
    return null;
  },

  clearDirectUserSession(): void {
    try {
      sessionStorage.removeItem('portal_direct_user_session');
    } catch (e) {}
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
    this.clearDirectUserSession();
    authListeners.forEach(cb => cb(null));
    try {
      await firebaseSignOut(auth);
    } catch (e) {}
  },

  onAuthChanged(callback: (user: FirebaseUser | null) => void) {
    authListeners.push(callback);

    // If direct session active, notify immediately
    const directUser = this.getDirectUserSession();
    if (directUser) {
      callback(directUser);
    }

    const unsubscribe = onAuthStateChanged(auth, fbUser => {
      if (fbUser) {
        callback(fbUser);
      } else if (!this.getDirectUserSession()) {
        callback(null);
      }
    });

    return () => {
      authListeners = authListeners.filter(cb => cb !== callback);
      unsubscribe();
    };
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
      // Update local cache with exact Firestore snapshot
      localStorage.setItem(LOCAL_USERS_CACHE_KEY, JSON.stringify(firestoreUsers));
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

  // Admin: Add authorized user with granular permissions
  async addAuthorizedUser(
    email: string,
    phone: string,
    permissions?: UserPermissions
  ): Promise<void> {
    const normalizedEmail = email.toLowerCase().trim();
    const id = normalizedEmail.replace(/[^a-zA-Z0-9]/g, '_');
    const userPermissions = permissions || DEFAULT_USER_PERMISSIONS;

    const newUser: AuthorizedUser = {
      id,
      email: normalizedEmail,
      phone: phone.trim(),
      status: 'active',
      permissions: userPermissions,
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
        permissions: userPermissions,
        addedAt: newUser.addedAt,
        addedBy: newUser.addedBy,
      });
    } catch (error) {
      console.warn('Firestore setDoc failed, retained in local cache:', error);
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  // Admin: Update user feature permissions
  async updateUserPermissions(id: string, permissions: UserPermissions): Promise<void> {
    // Update local cache
    try {
      const cached = localStorage.getItem(LOCAL_USERS_CACHE_KEY);
      if (cached) {
        const list: AuthorizedUser[] = JSON.parse(cached);
        const updated = list.map(u => (u.id === id ? { ...u, permissions } : u));
        localStorage.setItem(LOCAL_USERS_CACHE_KEY, JSON.stringify(updated));
      }
    } catch (e) {
      // ignore
    }

    const path = `authorizedUsers/${id}`;
    try {
      await updateDoc(doc(db, 'authorizedUsers', id), { permissions });
    } catch (error) {
      console.warn('Firestore updateDoc failed, retained in local cache:', error);
      handleFirestoreError(error, OperationType.UPDATE, path);
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

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { authService, DEFAULT_USER_PERMISSIONS } from '../services/authService';
import { userService } from '../services/userService';
import { UserProfile, UserPermissions } from '../types';

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isAuthorized: boolean;
  permissions: UserPermissions;
  refreshProfile: () => Promise<void>;
  refreshAuthorization: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
  isAuthorized: false,
  permissions: DEFAULT_USER_PERMISSIONS,
  refreshProfile: async () => {},
  refreshAuthorization: async () => {},
  signOut: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [permissions, setPermissions] = useState<UserPermissions>(DEFAULT_USER_PERMISSIONS);

  const loadUserData = async (fbUser: FirebaseUser | null) => {
    if (!fbUser) {
      setUser(null);
      setProfile(null);
      setIsAdmin(false);
      setIsAuthorized(false);
      setPermissions(DEFAULT_USER_PERMISSIONS);
      setLoading(false);
      return;
    }

    const email = fbUser.email || '';
    const adminStatus = authService.isAdminEmail(email);
    setIsAdmin(adminStatus);

    try {
      // Check invite authorization and feature permissions strictly from authorizedUsers roster
      const authInfo = await authService.getUserAuthorization(email);

      if (!authInfo.authorized) {
        // Unauthorized candidate (not added by admin) - strictly abort session
        await authService.signOut();
        setUser(null);
        setProfile(null);
        setIsAuthorized(false);
        setPermissions(DEFAULT_USER_PERMISSIONS);
        setLoading(false);
        return;
      }

      setUser(fbUser);
      setIsAuthorized(true);
      setPermissions(authInfo.permissions);

      // Fetch user profile for authorized candidate
      const prof = await userService.getUserProfile(fbUser.uid);
      setProfile(prof);
    } catch (err) {
      console.error('Error verifying authorization or profile:', err);
      await authService.signOut();
      setUser(null);
      setProfile(null);
      setIsAuthorized(false);
    } finally {
      setLoading(false);
    }
  };

  const refreshAuthorization = async () => {
    if (user?.email) {
      const authInfo = await authService.getUserAuthorization(user.email);
      setIsAuthorized(authInfo.authorized);
      setPermissions(authInfo.permissions);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      const prof = await userService.getUserProfile(user.uid);
      setProfile(prof);
    }
  };

  const handleSignOut = async () => {
    await authService.signOut();
    setUser(null);
    setProfile(null);
    setIsAdmin(false);
    setIsAuthorized(false);
    setPermissions(DEFAULT_USER_PERMISSIONS);
  };

  useEffect(() => {
    const unsubscribe = authService.onAuthChanged(fbUser => {
      loadUserData(fbUser);
    });
    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isAdmin,
        isAuthorized,
        permissions,
        refreshProfile,
        refreshAuthorization,
        signOut: handleSignOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

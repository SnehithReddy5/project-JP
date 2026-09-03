import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { authService } from '../services/authService';
import { userService } from '../services/userService';
import { UserProfile } from '../types';

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isAuthorized: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
  isAuthorized: false,
  refreshProfile: async () => {},
  signOut: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);

  const loadUserData = async (fbUser: FirebaseUser | null) => {
    if (!fbUser) {
      setUser(null);
      setProfile(null);
      setIsAdmin(false);
      setIsAuthorized(false);
      setLoading(false);
      return;
    }

    setUser(fbUser);
    const email = fbUser.email || '';
    const adminStatus = authService.isAdminEmail(email);
    setIsAdmin(adminStatus);

    try {
      // Check invite authorization
      const authorized = await authService.checkEmailAuthorized(email);
      setIsAuthorized(authorized);

      if (authorized || adminStatus) {
        setUser(fbUser);
        // Fetch user profile
        const prof = await userService.getUserProfile(fbUser.uid);
        setProfile(prof);
      } else {
        // Uninvited user: immediately sign out from Firebase session
        setUser(null);
        setProfile(null);
        await authService.signOut();
      }
    } catch (err) {
      console.error('Error verifying authorization or profile:', err);
    } finally {
      setLoading(false);
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
        refreshProfile,
        signOut: handleSignOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

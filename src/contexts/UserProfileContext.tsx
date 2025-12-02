'use client';

import React, { createContext, useContext, useCallback, useState, useEffect, useRef } from 'react';
import { useUser } from '@/lib/db-hooks';
import { UserProfile } from '@/lib/types';

interface UserProfileContextType {
  userProfile: UserProfile | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined);

export function UserProfileProvider({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const userIdRef = useRef<string | null>(null);

  const fetchUserProfile = useCallback(async (userId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // Add cache-busting query parameter to force fresh data
      const response = await fetch(`/api/db/users/${userId}?t=${Date.now()}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch user profile: ${response.statusText}`);
      }

      const result = await response.json();
      setUserProfile(result.data || null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setUserProfile(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isUserLoading) {
      if (user?.uid) {
        userIdRef.current = user.uid;
        fetchUserProfile(user.uid);
      } else {
        userIdRef.current = null;
        setUserProfile(null);
        setIsLoading(false);
      }
    }
  }, [isUserLoading, user?.uid, fetchUserProfile]);

  const refetch = useCallback(async () => {
    if (userIdRef.current) {
      await fetchUserProfile(userIdRef.current);
    }
  }, [fetchUserProfile]);

  return (
    <UserProfileContext.Provider
      value={{
        userProfile,
        isLoading: isUserLoading || isLoading,
        error,
        refetch,
      }}
    >
      {children}
    </UserProfileContext.Provider>
  );
}

export function useUserProfile() {
  const context = useContext(UserProfileContext);
  if (context === undefined) {
    throw new Error('useUserProfile must be used within a UserProfileProvider');
  }
  return context;
}
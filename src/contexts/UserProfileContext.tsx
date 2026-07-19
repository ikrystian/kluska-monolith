'use client';

import React, { createContext, useContext } from 'react';
import { useUser, useDoc } from '@/lib/db-hooks';
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

  // Ten sam klucz SWR co useDoc('users', uid) w widokach — jeden wspólny cache,
  // automatycznie odświeżany po mutacjach na kolekcji users.
  const { data: userProfile, isLoading, error, refetch } = useDoc<UserProfile>(
    user?.uid ? 'users' : null,
    user?.uid || null
  );

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

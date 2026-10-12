'use client';

import React, { createContext, useContext, useCallback } from 'react';
import useSWR from 'swr';
import { useUser, swrFetcher } from '@/lib/db-hooks';
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

  // Same key as `useDoc('users', uid)`, so pages reading the profile share this
  // request and its cache instead of fetching the document a second time after
  // the layout has already waited for it.
  const key = !isUserLoading && user?.uid ? `/api/db/users/${user.uid}` : null;
  const { data, error, isLoading, mutate } = useSWR<UserProfile>(key, swrFetcher, {
    // Never show the previous account's profile while switching users.
    keepPreviousData: false,
  });

  const refetch = useCallback(async () => {
    await mutate();
  }, [mutate]);

  return (
    <UserProfileContext.Provider
      value={{
        userProfile: key ? data ?? null : null,
        isLoading: isUserLoading || isLoading,
        error: error instanceof Error ? error : error ? new Error('Unknown error') : null,
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
